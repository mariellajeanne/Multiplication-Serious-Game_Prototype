package com.mypanaderya.game;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.bluetooth.BluetoothManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.nearby.Nearby;
import com.google.android.gms.nearby.connection.*;
import org.json.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Consumer;

/** Radio transport only. The existing validated JS protocol owns authorization and rewards. */
public final class NearbyDiscovery {
    static final int PERMISSIONS=924, MAX_LINKS=3, MAX_CANDIDATES=64;
    static final long SETUP_MS=30000, IDLE_MS=20000, SCAN_MS=12000;
    private static final String SERVICE="com.mypanaderya.game.cobaker.v1";
    private final Activity activity;
    private final Consumer<String> emit;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ConnectionsClient client;
    private final Map<String,JSONObject> candidates=new ConcurrentHashMap<>();
    private final Map<String,String> endpoints=new ConcurrentHashMap<>(), bound=new ConcurrentHashMap<>();
    private final Map<String,Long> pending=new ConcurrentHashMap<>(), touched=new ConcurrentHashMap<>();
    private final Map<String,Integer> attempts=new ConcurrentHashMap<>();
    private final Set<String> retained=new HashSet<>();
    private final Set<String> cancelled=new HashSet<>();
    private final Map<String,String> details=new ConcurrentHashMap<>();
    private JSONObject hello;
    private boolean foreground=true, enabled, advertising, advertisingPending, discovering, discoveryPending, available=true, permissionPending;
    private int generation, scanGeneration, failures, delivered;
    private AlertDialog pairing;
    private long scanUntil;
    NearbyDiscovery(Activity activity,Consumer<String> emit){this.activity=activity;this.emit=emit;client=Nearby.getConnectionsClient(activity);}
    static String[] permissions(int sdk){
        List<String> p=new ArrayList<>();
        if(sdk<=32){p.add(Manifest.permission.ACCESS_COARSE_LOCATION);p.add(Manifest.permission.ACCESS_FINE_LOCATION);}
        if(sdk>=31){p.add(Manifest.permission.BLUETOOTH_SCAN);p.add(Manifest.permission.BLUETOOTH_CONNECT);p.add(Manifest.permission.BLUETOOTH_ADVERTISE);}
        if(sdk>=33)p.add(Manifest.permission.NEARBY_WIFI_DEVICES);
        return p.toArray(new String[0]);
    }
    // Short endpoint metadata is public and unverified until authenticated hello.
    static String endpointName(JSONObject player,boolean available)throws JSONException{
        String name=player.getString("name").replace('|','·');
        while(name.getBytes(StandardCharsets.UTF_8).length>72)name=name.substring(0,name.offsetByCodePoints(name.length(),-1));
        return player.getString("id")+"|"+player.getString("number")+"|"+(available?"1":"0")+"|"+name;
    }
    static JSONObject profile(String name)throws JSONException{
        String[] p=name.split("\\|",4);
        if(p.length!=4||!p[0].matches("[a-f0-9]{32}")||!p[1].matches("[0-9]{4}")||!p[2].matches("[01]")||p[3].trim().isEmpty()||p[3].length()>24||!p[3].equals(p[3].trim())||p[3].matches("(?s).*[\\x00-\\x1f\\x7f-\\x9f\\u202a-\\u202e\\u2066-\\u2069].*"))throw new JSONException("Invalid advertisement");
        return new JSONObject().put("id",p[0]).put("number",p[1]).put("name",p[3]).put("available",p[2].equals("1"));
    }
    private void event(JSONObject value){emit.accept(value.toString());}
    private void status(String state,String error){try{if(!error.isEmpty())details.put("Last error",error.substring(0,Math.min(180,error.length())));event(new JSONObject().put("kind","status").put("status",state).put("error",error));}catch(JSONException ignored){}}
    private void failure(String operation,Exception e){failures++;details.put("Last error",operation+": "+e.getClass().getSimpleName()+" "+String.valueOf(e.getMessage()).substring(0,Math.min(120,String.valueOf(e.getMessage()).length())));}
    private void connectionFailed(String endpoint){for(Map.Entry<String,String> e:endpoints.entrySet())if(endpoint.equals(e.getValue()))try{event(new JSONObject().put("kind","connection-failed").put("playerId",e.getKey()));}catch(JSONException ignored){}}
    @JavascriptInterface public void start(String text){
        try{JSONObject m=LanDiscovery.parse(text);if(!"hello".equals(m.getString("type")))return;
            main.post(()->{shutdown();hello=m;enabled=true;attempts.clear();if(foreground)begin();});
        }catch(JSONException e){status("unavailable","Invalid local profile");}
    }
    @JavascriptInterface public void stop(){main.post(()->{enabled=false;shutdown();});}
    private boolean ready(){return enabled&&foreground&&hello!=null;}
    private void begin(){
        if(!ready()||advertising||advertisingPending)return;
        int gms=GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(activity);
        details.put("Google Play services",String.valueOf(gms));
        if(gms!=0){status("unavailable","Nearby needs available, updated Google Play services (code "+gms+"). Native LAN remains selectable.");return;}
        List<String> missing=new ArrayList<>();for(String p:permissions(Build.VERSION.SDK_INT))if(activity.checkSelfPermission(p)!=PackageManager.PERMISSION_GRANTED)missing.add(p);
        if(!missing.isEmpty()){
            status("unavailable","Nearby permissions are required. Allow Nearby devices and, on older Android, Location.");
            if(!permissionPending){permissionPending=true;activity.requestPermissions(missing.toArray(new String[0]),PERMISSIONS);}return;
        }
        try{
            BluetoothManager bt=activity.getSystemService(BluetoothManager.class);
            WifiManager wifi=(WifiManager)activity.getApplicationContext().getSystemService(Activity.WIFI_SERVICE);
            if(bt==null||bt.getAdapter()==null||!bt.getAdapter().isEnabled()||wifi==null||!wifi.isWifiEnabled()){
                status("unavailable","Enable Bluetooth and Wi-Fi, then retry Nearby. Internet is not required.");return;
            }
            boolean locationOn=Build.VERSION.SDK_INT>=28?activity.getSystemService(LocationManager.class).isLocationEnabled():android.provider.Settings.Secure.getInt(activity.getContentResolver(),android.provider.Settings.Secure.LOCATION_MODE,0)!=0;
            if(Build.VERSION.SDK_INT<=32&&!locationOn){
                status("unavailable","Turn on Location services for Nearby discovery on this Android version.");return;
            }
            advertise();status("searching","");main.removeCallbacks(maintenance);main.postDelayed(maintenance,5000);
        }catch(Exception e){failure("Startup",e);status("unavailable","Nearby could not start. Check permissions and radios; Native LAN remains selectable.");}
    }
    void permissionsResult(){permissionPending=false;if(!ready())return;for(String p:permissions(Build.VERSION.SDK_INT))if(activity.checkSelfPermission(p)!=PackageManager.PERMISSION_GRANTED){status("unavailable","Nearby permission denied. Solo play and Native LAN remain available. Retry in Settings after granting permission.");return;}begin();}
    private void advertise(){
        if(advertising||advertisingPending||!ready())return;
        final int gen=generation;final boolean advertisedAvailability=available;advertisingPending=true;
        try{client.startAdvertising(endpointName(hello.getJSONObject("player"),available),SERVICE,lifecycle(gen),new AdvertisingOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build())
            .addOnSuccessListener(v->{if(gen==generation&&ready()){advertisingPending=false;advertising=true;if(advertisedAvailability!=available){client.stopAdvertising();advertising=false;advertise();}}})
            .addOnFailureListener(e->{if(gen==generation){advertisingPending=false;failure("Advertising",e);status(bound.isEmpty()?"unavailable":"searching","Nearby advertising failed. Check radios and permissions, then retry.");}});
        }catch(Exception e){advertisingPending=false;failure("Advertising",e);}
    }
    @JavascriptInterface public void availability(boolean value){main.post(()->{if(available==value)return;available=value;if(advertising&&ready()){client.stopAdvertising();advertising=false;advertise();}});}
    @JavascriptInterface public void scan(){main.post(()->{
        if(!ready())return;
        scanUntil=System.currentTimeMillis()+SCAN_MS;if(discovering||discoveryPending)return;final int gen=generation,scan=++scanGeneration;discoveryPending=true;
        for(String id:new ArrayList<>(candidates.keySet()))if(!bound.containsValue(id)){candidates.remove(id);endpoints.remove(id);try{event(new JSONObject().put("kind","candidate-left").put("playerId",id));}catch(JSONException ignored){}}
        // Attempts are bounded per explicit scan. Never connect merely because a device was found.
        attempts.clear();
        try{client.startDiscovery(SERVICE,new EndpointDiscoveryCallback(){
            @Override public void onEndpointFound(String endpoint,DiscoveredEndpointInfo info){if(gen!=generation||scan!=scanGeneration||!ready()||scanUntil==0)return;
                try{JSONObject p=profile(info.getEndpointName());String id=p.getString("id");if(id.equals(hello.getJSONObject("player").getString("id"))||!candidates.containsKey(id)&&candidates.size()>=MAX_CANDIDATES)return;
                    candidates.put(id,p);endpoints.put(id,endpoint);event(new JSONObject().put("kind","candidate").put("player",p));
                }catch(JSONException ignored){}
            }
            @Override public void onEndpointLost(String endpoint){if(gen!=generation||scan!=scanGeneration)return;for(String id:new ArrayList<>(endpoints.keySet()))if(endpoint.equals(endpoints.get(id))&&!bound.containsKey(endpoint)){endpoints.remove(id);candidates.remove(id);try{event(new JSONObject().put("kind","candidate-left").put("playerId",id));}catch(JSONException ignored){}}}
        },new DiscoveryOptions.Builder().setStrategy(Strategy.P2P_CLUSTER).build()).addOnSuccessListener(v->{if(gen==generation&&scan==scanGeneration){discoveryPending=false;if(scanUntil>System.currentTimeMillis())discovering=true;else client.stopDiscovery();}})
            .addOnFailureListener(e->{if(gen==generation&&scan==scanGeneration){discoveryPending=false;failure("Discovery",e);status("searching","Nearby discovery failed. Check radios and retry Find Bakers.");}});
        }catch(Exception e){discoveryPending=false;failure("Discovery",e);}
    });}
    @JavascriptInterface public void stopScan(){main.post(()->{scanUntil=0;scanGeneration++;client.stopDiscovery();discovering=false;discoveryPending=false;});}
    @JavascriptInterface public void release(String id){if(id==null||!id.matches("[a-f0-9]{32}"))return;main.post(()->{String endpoint=endpoints.get(id);if(endpoint==null)return;boolean wasPending=pending.containsKey(endpoint);if(wasPending){cancelled.add(endpoint);while(cancelled.size()>MAX_CANDIDATES)cancelled.remove(cancelled.iterator().next());}disconnect(endpoint);if(wasPending&&pairing!=null)pairing.dismiss();});}
    @JavascriptInterface public void connect(String id){main.post(()->{
        String endpoint=endpoints.get(id);if(!ready()||endpoint==null||bound.containsValue(id)||pending.containsKey(endpoint))return;
        if(bound.size()+pending.size()>=MAX_LINKS||attempts.getOrDefault(id,0)>=2)return;
        cancelled.remove(endpoint);attempts.put(id,attempts.getOrDefault(id,0)+1);pending.put(endpoint,System.currentTimeMillis());final int gen=generation;
        try{client.requestConnection(endpointName(hello.getJSONObject("player"),available),endpoint,lifecycle(gen)).addOnFailureListener(e->{if(gen==generation){pending.remove(endpoint);connectionFailed(endpoint);failure("Connection",e);}});}catch(Exception e){pending.remove(endpoint);connectionFailed(endpoint);failure("Connection",e);}
    });}
    private ConnectionLifecycleCallback lifecycle(final int gen){return new ConnectionLifecycleCallback(){
        @Override public void onConnectionInitiated(String endpoint,ConnectionInfo info){
            if(gen!=generation||!ready()||cancelled.contains(endpoint)||pairing!=null||bound.size()+pending.size()>=MAX_LINKS&&!pending.containsKey(endpoint)){client.rejectConnection(endpoint);return;}
            try{JSONObject p=profile(info.getEndpointName());String id=p.getString("id");
                if(id.equals(hello.getJSONObject("player").getString("id"))||bound.containsValue(id)||bound.size()>=MAX_LINKS){client.rejectConnection(endpoint);return;}
                if(!candidates.containsKey(id)&&candidates.size()>=MAX_CANDIDATES){client.rejectConnection(endpoint);return;}
                candidates.put(id,p);endpoints.put(id,endpoint);pending.put(endpoint,System.currentTimeMillis());
                pairing=new AlertDialog.Builder(activity).setTitle("Connect to "+p.getString("name")+" #"+p.getString("number"))
                    .setMessage("Compare this code on both tablets: "+info.getAuthenticationDigits()+"\nConfirm only if the codes match. Worksheet access needs a separate Help request.")
                    .setPositiveButton("Codes match",(dialog,which)->{if(gen==generation&&pending.containsKey(endpoint))client.acceptConnection(endpoint,payloads(gen)).addOnFailureListener(e->{if(gen==generation){failure("Accept",e);connectionFailed(endpoint);disconnect(endpoint);}});})
                    .setNegativeButton("Reject",(dialog,which)->{client.rejectConnection(endpoint);pending.remove(endpoint);connectionFailed(endpoint);})
                    .setOnCancelListener(dialog->{client.rejectConnection(endpoint);pending.remove(endpoint);connectionFailed(endpoint);}).create();
                pairing.setOnDismissListener(dialog->pairing=null);pairing.show();
            }catch(JSONException e){client.rejectConnection(endpoint);}
        }
        @Override public void onConnectionResult(String endpoint,ConnectionResolution result){
            if(gen!=generation||!ready())return;
            Long since=pending.remove(endpoint);
            if(!result.getStatus().isSuccess()||since==null){failures++;connectionFailed(endpoint);disconnect(endpoint);return;}
            String id=null;for(Map.Entry<String,String> e:endpoints.entrySet())if(e.getValue().equals(endpoint))id=e.getKey();
            if(id==null||bound.containsValue(id)){disconnect(endpoint);return;}
            bound.put(endpoint,id);touched.put(endpoint,System.currentTimeMillis());details.put("Last connection setup ms",String.valueOf(System.currentTimeMillis()-since));
            write(endpoint,hello);
        }
        @Override public void onDisconnected(String endpoint){if(gen==generation)removed(endpoint);}
    };}
    private PayloadCallback payloads(final int gen){return new PayloadCallback(){
        @Override public void onPayloadReceived(String endpoint,Payload payload){
            if(gen!=generation||!ready()||!bound.containsKey(endpoint))return;
            byte[] bytes=payload.asBytes();if(payload.getType()!=Payload.Type.BYTES||bytes==null||bytes.length>32768){disconnect(endpoint);return;}
            try{JSONObject m=LanDiscovery.parse(new String(bytes,StandardCharsets.UTF_8));
                if(!bound.get(endpoint).equals(m.getJSONObject("player").getString("id"))){disconnect(endpoint);return;}
                delivered++;event(new JSONObject().put("kind","message").put("message",m));
                if("test".equals(m.getString("type"))){JSONObject reply=fresh("reply");reply.put("replyTo",m.getString("id"));write(endpoint,reply);}
            }catch(JSONException e){failure("Payload validation",e);disconnect(endpoint);}
        }
        @Override public void onPayloadTransferUpdate(String endpoint,PayloadTransferUpdate update){if(gen==generation&&update.getStatus()==PayloadTransferUpdate.Status.FAILURE){failures++;details.put("Last error","Nearby payload transfer failed; durable rewards will retry.");}}
    };}
    private JSONObject fresh(String type)throws JSONException{JSONObject m=new JSONObject(hello.toString());m.put("id",UUID.randomUUID().toString().replace("-",""));m.put("type",type);return m;}
    private void write(String endpoint,JSONObject m){client.sendPayload(endpoint,Payload.fromBytes(m.toString().getBytes(StandardCharsets.UTF_8))).addOnFailureListener(e->failure("Send",e));}
    @JavascriptInterface public void send(String id,String text){try{JSONObject m=LanDiscovery.parse(text);main.post(()->{
        try{if(!ready()||!m.getJSONObject("player").getString("id").equals(hello.getJSONObject("player").getString("id"))||!m.getString("session").equals(hello.getString("session")))return;
            for(Map.Entry<String,String> e:bound.entrySet())if(e.getValue().equals(id)){write(e.getKey(),m);break;}
        }catch(JSONException ignored){}
    });}catch(JSONException ignored){}}
    @JavascriptInterface public void retain(String text){if(text==null||text.length()>4096)return;main.post(()->{try{JSONArray ids=new JSONArray(text);retained.clear();for(int i=0;i<Math.min(ids.length(),MAX_LINKS);i++)retained.add(ids.getString(i));}catch(JSONException ignored){}});}
    private void removed(String endpoint){pending.remove(endpoint);touched.remove(endpoint);String id=bound.remove(endpoint);if(id!=null)try{event(new JSONObject().put("kind","left").put("playerId",id));}catch(JSONException ignored){}}
    private void disconnect(String endpoint){client.disconnectFromEndpoint(endpoint);removed(endpoint);}
    private final Runnable maintenance=new Runnable(){public void run(){if(!ready())return;long now=System.currentTimeMillis();
        if(discovering&&now>=scanUntil){client.stopDiscovery();discovering=false;}
        for(String endpoint:new ArrayList<>(pending.keySet()))if(now-pending.get(endpoint)>SETUP_MS){connectionFailed(endpoint);disconnect(endpoint);if(pairing!=null)pairing.dismiss();}
        for(String endpoint:new ArrayList<>(bound.keySet())){if(retained.contains(bound.get(endpoint)))touched.put(endpoint,now);
            if(now-touched.getOrDefault(endpoint,now)>IDLE_MS)disconnect(endpoint);else try{write(endpoint,fresh("hello"));}catch(JSONException ignored){}}
        main.postDelayed(this,5000);
    }};
    private void shutdown(){generation++;main.removeCallbacks(maintenance);client.stopDiscovery();client.stopAdvertising();client.stopAllEndpoints();if(pairing!=null)pairing.dismiss();advertising=false;advertisingPending=false;discovering=false;discoveryPending=false;bound.clear();pending.clear();touched.clear();retained.clear();cancelled.clear();candidates.clear();endpoints.clear();}
    void resume(){foreground=true;if(enabled)begin();}
    void pause(){foreground=false;shutdown();}
    void destroy(){enabled=false;shutdown();}
    @JavascriptInterface public String diagnostics(){if(!BuildConfig.DEBUG)return "{}";try{return new JSONObject().put("Device",Build.MANUFACTURER+" "+Build.MODEL).put("Android",Build.VERSION.RELEASE+" / API "+Build.VERSION.SDK_INT)
        .put("App",BuildConfig.VERSION_NAME+" debug / "+BuildConfig.VERSION_CODE).put("Protocol","v1 / Co-Baker 8").put("SDK","play-services-nearby 19.5.1")
        .put("Strategy","P2P_CLUSTER; at most "+MAX_LINKS+" local links").put("Nearby advertising",advertising).put("Nearby discovering",discovering)
        .put("Nearby candidates",candidates.size()).put("Nearby connected",bound.size()).put("Nearby connecting",pending.size()).put("Connection failures",failures).put("Messages received",delivered)
        .put("Details",new JSONObject(details)).put("Media","SDK selected; API success does not prove WLAN Partition bypass").toString();}catch(JSONException e){return "{}";}}
    @JavascriptInterface public void copyDetails(String summary){if(!BuildConfig.DEBUG||summary==null||summary.length()>4096)return;main.post(()->{try{
        activity.getSystemService(ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("My Panaderya diagnostics",LanDiscovery.diagnosticReport(summary,diagnostics())));
        event(new JSONObject().put("kind","copy-details").put("status","copied"));
    }catch(Exception ignored){try{event(new JSONObject().put("kind","copy-details").put("status","failed"));}catch(JSONException unused){}}});}
}
