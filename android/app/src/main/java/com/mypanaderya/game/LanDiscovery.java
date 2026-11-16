package com.mypanaderya.game;

import android.content.Context;
import android.net.*;
import android.net.nsd.*;
import android.net.wifi.WifiManager;
import android.os.Handler;
import android.os.Looper;
import android.os.Build;
import android.webkit.JavascriptInterface;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

/** Direct NSD/TCP presence, fixed test messages and advisory coordinator messages only; never accepts game commands. */
public final class LanDiscovery {
    private static final String TYPE="_panaderya._tcp.";
    private final NsdManager nsd;
    private final ConnectivityManager connectivity;
    private final WifiManager wifi;
    private final Consumer<String> emit;
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService io=new ThreadPoolExecutor(4,4,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(64),new ThreadPoolExecutor.AbortPolicy());
    private final ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();
    private final Map<String,Endpoint> peers=new ConcurrentHashMap<>();
    private final Map<String,String> services=new ConcurrentHashMap<>();
    private volatile JSONObject hello;
    private volatile ServerSocket server;
    private volatile Network network;
    private volatile int generation;
    private boolean foreground=true;
    private boolean enabled;
    private final Set<Socket> sockets=ConcurrentHashMap.newKeySet();
    private WifiManager.MulticastLock multicast;
    private NsdManager.RegistrationListener registration;
    private NsdManager.DiscoveryListener discovery;
    private final ArrayDeque<NsdServiceInfo> resolveQueue=new ArrayDeque<>();
    private final Map<String,Integer> resolveAttempts=new HashMap<>();
    private boolean resolving;
    private final ConnectivityManager.NetworkCallback networkCallback=new ConnectivityManager.NetworkCallback(){
        @Override public void onAvailable(Network n){restartSoon();}
        @Override public void onLost(Network n){restartSoon();}
        @Override public void onLinkPropertiesChanged(Network n,LinkProperties p){if(network==null)restartSoon();}
    };
    private final Runnable restart=()->{if(foreground&&enabled&&hello!=null)begin();};
    private static final class Endpoint {
        final InetAddress host; final int port; final int generation;
        Endpoint(InetAddress h,int p,int g){host=h;port=p;generation=g;}
    }
    LanDiscovery(Context context,Consumer<String> emit){
        this.emit=emit;nsd=context.getSystemService(NsdManager.class);connectivity=context.getSystemService(ConnectivityManager.class);wifi=(WifiManager)context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        connectivity.registerNetworkCallback(new NetworkRequest.Builder().addTransportType(NetworkCapabilities.TRANSPORT_WIFI).build(),networkCallback);
        timer.scheduleWithFixedDelay(()->{for(Map.Entry<String,Endpoint> e:peers.entrySet())submit(()->exchange(e.getKey(),e.getValue(),fresh("hello",null)));},5,5,TimeUnit.SECONDS);
    }
    private boolean submit(Runnable task){try{io.execute(task);return true;}catch(RejectedExecutionException e){return false;}}
    private void restartSoon(){main.removeCallbacks(restart);main.postDelayed(restart,600);}
    @JavascriptInterface public void start(String json){
        try{JSONObject m=parse(json);if(!"hello".equals(m.getString("type")))return;main.post(()->{hello=m;enabled=true;if(foreground)begin();});}catch(Exception e){status("unavailable","Invalid local profile");}
    }
    @JavascriptInterface public void stop(){main.post(()->{enabled=false;shutdown();});}
    @JavascriptInterface public void send(String id,String json){
        try{JSONObject m=parse(json);if(hello==null||!Arrays.asList("test","coord","help").contains(m.getString("type"))||!m.getJSONObject("player").getString("id").equals(hello.getJSONObject("player").getString("id"))||!m.getString("session").equals(hello.getString("session")))return;
            Endpoint endpoint=peers.get(id);if(endpoint!=null)submit(()->exchange(id,endpoint,m));
        }catch(Exception e){status("searching","Test could not be sent");}
    }
    void resume(){foreground=true;if(enabled&&hello!=null)begin();}
    void pause(){foreground=false;shutdown();}
    void destroy(){pause();connectivity.unregisterNetworkCallback(networkCallback);io.shutdownNow();timer.shutdownNow();}
    private void status(String state,String error){event("status",new JSONObject(),state,error);}
    private void event(String kind,JSONObject message,String state,String error){try{JSONObject e=new JSONObject().put("kind",kind);if(message.length()>0)e.put("message",message);if(state!=null)e.put("status",state);if(error!=null)e.put("error",error);emit.accept(e.toString());}catch(JSONException ignored){}}
    private void left(String id){peers.remove(id);try{emit.accept(new JSONObject().put("kind","left").put("playerId",id).toString());}catch(JSONException ignored){}}
    private void begin(){
        shutdown();if(hello==null)return;
        for(Network n:connectivity.getAllNetworks()){NetworkCapabilities cap=connectivity.getNetworkCapabilities(n);if(cap!=null&&cap.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)){network=n;break;}}
        if(network==null){status("unavailable","Connect to local Wi-Fi. Internet is not required.");return;}
        final int gen=generation;
        try{
            LinkProperties links=connectivity.getLinkProperties(network);InetAddress bind=null;
            if(links!=null)for(LinkAddress address:links.getLinkAddresses())if(address.getAddress() instanceof Inet4Address){bind=address.getAddress();break;}
            if(bind==null)throw new IOException("Wi-Fi has no IPv4 address yet");
            server=new ServerSocket();server.bind(new InetSocketAddress(bind,0));final ServerSocket listening=server;
            multicast=wifi.createMulticastLock("panaderya-discovery");multicast.setReferenceCounted(false);multicast.acquire();
            submit(()->{while(gen==generation&&!listening.isClosed())try{Socket socket=listening.accept();if(!submit(()->handle(socket,gen)))socket.close();}catch(IOException e){break;}});
            registration=new NsdManager.RegistrationListener(){
                public void onServiceRegistered(NsdServiceInfo i){}
                public void onServiceUnregistered(NsdServiceInfo i){}
                public void onRegistrationFailed(NsdServiceInfo i,int code){if(gen==generation)status("unavailable","LAN advertisement failed: "+code);}
                public void onUnregistrationFailed(NsdServiceInfo i,int code){}
            };
            NsdServiceInfo info=new NsdServiceInfo();info.setServiceName("panaderya-"+UUID.randomUUID().toString().substring(0,12));info.setServiceType(TYPE);info.setPort(server.getLocalPort());info.setAttribute("v","1");nsd.registerService(info,NsdManager.PROTOCOL_DNS_SD,registration);
            discovery=new NsdManager.DiscoveryListener(){
                public void onDiscoveryStarted(String t){}
                public void onDiscoveryStopped(String t){}
                public void onStartDiscoveryFailed(String t,int code){if(gen==generation)status("unavailable","LAN search failed: "+code);}
                public void onStopDiscoveryFailed(String t,int code){}
                public void onServiceFound(NsdServiceInfo i){main.post(()->{if(gen==generation&&resolveQueue.size()<64){resolveQueue.add(i);resolveNext(gen);}});}
                public void onServiceLost(NsdServiceInfo i){main.post(()->{if(gen==generation){String id=services.remove(i.getServiceName());if(id!=null)left(id);}});}
            };
            nsd.discoverServices(TYPE,NsdManager.PROTOCOL_DNS_SD,discovery);status("searching","");
        }catch(Exception e){shutdown();status("unavailable","LAN unavailable: "+e.getMessage());}
    }
    @SuppressWarnings("deprecation") private void resolveNext(int gen){
        if(resolving||resolveQueue.isEmpty()||gen!=generation)return;resolving=true;NsdServiceInfo service=resolveQueue.remove();
        nsd.resolveService(service,new NsdManager.ResolveListener(){
            public void onResolveFailed(NsdServiceInfo i,int code){main.post(()->{if(gen==generation){resolving=false;int attempts=resolveAttempts.getOrDefault(service.getServiceName(),0)+1;resolveAttempts.put(service.getServiceName(),attempts);if(attempts<3)main.postDelayed(()->{if(gen==generation&&resolveQueue.size()<64){resolveQueue.add(service);resolveNext(gen);}},2000);resolveNext(gen);}});}
            public void onServiceResolved(NsdServiceInfo i){main.post(()->{if(gen!=generation)return;resolving=false;InetAddress host=resolvedIpv4(i);if(host!=null&&i.getPort()>0&&peers.size()<128){Endpoint endpoint=new Endpoint(host,i.getPort(),gen);submit(()->{String id=exchange(null,endpoint,fresh("hello",null));if(id!=null&&gen==generation){services.put(i.getServiceName(),id);peers.put(id,endpoint);}});}resolveNext(gen);});}
        });
    }
    @SuppressWarnings("deprecation") private static InetAddress resolvedIpv4(NsdServiceInfo service){
        // The listening socket is IPv4. A dual-stack NSD result may list IPv6
        // first; select a compatible address instead of silently failing TCP.
        return localIpv4(Build.VERSION.SDK_INT>=34?service.getHostAddresses():Collections.singletonList(service.getHost()));
    }
    static InetAddress localIpv4(List<InetAddress> addresses){
        for(InetAddress host:addresses)if(host instanceof Inet4Address&&(host.isSiteLocalAddress()||host.isLinkLocalAddress()))return host;
        return null;
    }
    private void shutdown(){
        generation++;main.removeCallbacks(restart);resolveQueue.clear();resolveAttempts.clear();resolving=false;network=null;
        try{if(server!=null)server.close();}catch(IOException ignored){}server=null;
        for(Socket socket:sockets)try{socket.close();}catch(IOException ignored){}sockets.clear();
        try{if(discovery!=null)nsd.stopServiceDiscovery(discovery);}catch(Exception ignored){}discovery=null;
        try{if(registration!=null)nsd.unregisterService(registration);}catch(Exception ignored){}registration=null;
        if(multicast!=null&&multicast.isHeld())multicast.release();multicast=null;
        for(String id:new ArrayList<>(peers.keySet()))left(id);services.clear();status("disconnected","");
    }
    private JSONObject fresh(String type,String reply){
        try{return new JSONObject().put("v",1).put("id",UUID.randomUUID().toString().replace("-","")).put("session",hello.getString("session")).put("player",hello.getJSONObject("player")).put("type",type).putOpt("replyTo",reply);}catch(Exception e){return null;}
    }
    private void handle(Socket socket,int gen){
        sockets.add(socket);
        try(Socket s=socket){if(gen!=generation||hello==null)return;s.setSoTimeout(2500);JSONObject message=parse(read(s));if(gen!=generation||"reply".equals(message.getString("type")))return;
            String id=message.getJSONObject("player").getString("id");if(id.equals(hello.getJSONObject("player").getString("id")))return;
            main.post(()->{if(gen==generation)event("message",message,null,null);});write(s,fresh("test".equals(message.getString("type"))?"reply":"hello","test".equals(message.getString("type"))?message.getString("id"):null));
        }catch(Exception ignored){/* Invalid traffic cannot affect solo play. */}finally{sockets.remove(socket);}
    }
    private String exchange(String expected,Endpoint endpoint,JSONObject message){
        Network n=network;if(n==null||message==null||endpoint.generation!=generation)return null;
        Socket connection=new Socket();sockets.add(connection);
        try(Socket socket=connection){
            n.bindSocket(socket);socket.connect(new InetSocketAddress(endpoint.host,endpoint.port),2000);socket.setSoTimeout(2500);write(socket,message);JSONObject reply=parse(read(socket));
            String id=reply.getJSONObject("player").getString("id");if(endpoint.generation!=generation||id.equals(hello.getJSONObject("player").getString("id"))||expected!=null&&!expected.equals(id))return null;
            if("test".equals(message.getString("type"))? !"reply".equals(reply.getString("type"))||!message.getString("id").equals(reply.optString("replyTo")) : !"hello".equals(reply.getString("type")))return null;
            main.post(()->{if(endpoint.generation==generation)event("message",reply,null,null);});return id;
        }catch(Exception e){if(expected!=null&&endpoint.generation==generation)try{emit.accept(new JSONObject().put("kind","left").put("playerId",expected).toString());}catch(JSONException ignored){}return null;}finally{sockets.remove(connection);}
    }
    private static String read(Socket s)throws IOException{
        ByteArrayOutputStream bytes=new ByteArrayOutputStream();long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);int b;while((b=s.getInputStream().read())!=-1&&b!='\n'){if(bytes.size()>=8192||System.nanoTime()>deadline)throw new IOException("Message limit");bytes.write(b);}if(b!='\n')throw new IOException("Incomplete message");return StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes.toByteArray())).toString();
    }
    private static void write(Socket s,JSONObject m)throws IOException{s.getOutputStream().write((m.toString()+"\n").getBytes(StandardCharsets.UTF_8));s.getOutputStream().flush();}
    private static void onlyKeys(JSONObject value,String... allowed)throws JSONException{
        Set<String> keys=new HashSet<>(Arrays.asList(allowed));Iterator<String> it=value.keys();while(it.hasNext())if(!keys.contains(it.next()))throw new JSONException("Unknown coordinator field");
    }
    private static long term(JSONObject value,String key)throws JSONException{
        Object n=value.opt(key);if(!(n instanceof Number)||value.getDouble(key)!=value.getLong(key)||value.getLong(key)<0||value.getLong(key)>1000000000)throw new JSONException("Invalid term");return value.getLong(key);
    }
    private static void id(JSONObject value,String key)throws JSONException{
        if(!(value.opt(key) instanceof String)||!value.getString(key).matches("[a-f0-9]{32}"))throw new JSONException("Invalid coordinator ID");
    }
    private static void validateCoordinator(JSONObject c)throws JSONException{
        Object kind=c.opt("kind");
        if("probe".equals(kind)||"notice".equals(kind)){onlyKeys(c,"kind");return;}
        if(!"state".equals(kind))throw new JSONException("Unknown coordinator message");
        onlyKeys(c,"kind","replyTo","term","leader");id(c,"replyTo");long epoch=term(c,"term");
        if(!c.has("leader"))throw new JSONException("Missing leader");
        if(!c.isNull("leader")){JSONObject leader=c.getJSONObject("leader");onlyKeys(leader,"id","session","term");id(leader,"id");id(leader,"session");long leaderTerm=term(leader,"term");if(leaderTerm==0||leaderTerm>epoch)throw new JSONException("Invalid leader term");}
    }
    private static int worksheetInt(JSONObject s,String key,int max)throws JSONException{
        Object n=s.opt(key);if(!(n instanceof Number)||s.getDouble(key)!=s.getInt(key)||s.getInt(key)<0||s.getInt(key)>max)throw new JSONException("Invalid worksheet number");return s.getInt(key);
    }
    private static void worksheetDigits(JSONObject v)throws JSONException{
        if(v.length()>7)throw new JSONException("Too many digits");Iterator<String> it=v.keys();while(it.hasNext()){String k=it.next();if(!k.matches("[0-6]"))throw new JSONException("Invalid column");worksheetInt(v,k,9);}
    }
    private static void validateWorksheet(JSONObject s)throws JSONException{
        String[] fields={"a","b","A","B","cols","row","k","first","phase","revealed","raw","mixed","incoming","onesPlaced","tensPlaced","tensLocation","chosen","carrySlots","rows","sum","sumCol","sumCarry","done","boxes","complete","carryArmed"};
        onlyKeys(s,fields);for(String k:fields)if(!s.has(k))throw new JSONException("Missing worksheet field");
        int a=worksheetInt(s,"a",99999),b=worksheetInt(s,"b",99);if(a<1||b<1)throw new JSONException("Invalid operands");
        int al=String.valueOf(a).length(),bl=String.valueOf(b).length();
        for(String key:Arrays.asList("A","B")){org.json.JSONArray arr=s.getJSONArray(key);String digits=new StringBuilder(String.valueOf(key.equals("A")?a:b)).reverse().toString();if(arr.length()!=digits.length())throw new JSONException("Invalid operand digits");for(int i=0;i<arr.length();i++)if(!(arr.opt(i) instanceof Number)||arr.getDouble(i)!=digits.charAt(i)-'0')throw new JSONException("Invalid operand digits");}
        if(worksheetInt(s,"cols",7)!=String.valueOf(a*b).length())throw new JSONException("Invalid columns");
        worksheetInt(s,"row",bl-1);int col=worksheetInt(s,"k",al);worksheetInt(s,"done",al*bl);worksheetInt(s,"boxes",10);worksheetInt(s,"raw",81);worksheetInt(s,"incoming",9);worksheetInt(s,"sumCol",7);worksheetInt(s,"sumCarry",9);
        if(!Arrays.asList("select","product","sum","complete").contains(s.getString("phase"))||s.getString("phase").equals("product")&&col>=al)throw new JSONException("Invalid worksheet phase");
        for(String k:Arrays.asList("revealed","mixed","onesPlaced","tensPlaced","complete","carryArmed"))if(!(s.opt(k) instanceof Boolean))throw new JSONException("Invalid worksheet flag");
        if(!s.isNull("chosen")&&!Arrays.asList("ones","tens").contains(s.getString("chosen"))||!s.isNull("tensLocation")&&!Arrays.asList("row","carry").contains(s.getString("tensLocation")))throw new JSONException("Invalid selection");
        if(!s.isNull("first")){JSONObject first=s.getJSONObject("first");onlyKeys(first,"kind","c");if(!Arrays.asList("top","bottom").contains(first.getString("kind")))throw new JSONException("Invalid operand");worksheetInt(first,"c",first.getString("kind").equals("top")?al-1:bl-1);}
        org.json.JSONArray rows=s.getJSONArray("rows");if(rows.length()!=bl)throw new JSONException("Invalid rows");for(int i=0;i<rows.length();i++)worksheetDigits(rows.getJSONObject(i));worksheetDigits(s.getJSONObject("sum"));
        JSONObject carries=s.getJSONObject("carrySlots");if(carries.length()>6)throw new JSONException("Invalid carries");Iterator<String> it=carries.keys();while(it.hasNext()){String k=it.next();if(!k.matches("[0-5]"))throw new JSONException("Invalid carry column");JSONObject carry=carries.getJSONObject(k);onlyKeys(carry,"value","provisional");worksheetInt(carry,"value",9);if(!(carry.opt("provisional") instanceof Boolean))throw new JSONException("Invalid carry");}
    }
    private static void worksheetText(JSONObject o,String k,int max)throws JSONException{
        Object v=o.opt(k);if(!(v instanceof String)||((String)v).length()>max||((String)v).matches("(?s).*[\\x00-\\x1f].*"))throw new JSONException("Invalid presentation text");
    }
    private static void worksheetFlags(JSONObject o,String... names)throws JSONException{
        for(String k:names)if(!(o.opt(k) instanceof Boolean))throw new JSONException("Invalid presentation flag");
    }
    private static void worksheetTarget(Object value)throws JSONException{
        if(value==JSONObject.NULL)return;
        if(!(value instanceof JSONObject))throw new JSONException("Invalid target");JSONObject t=(JSONObject)value;
        onlyKeys(t,"kind","r","c");worksheetInt(t,"c",6);
        if("slot".equals(t.opt("kind")))worksheetInt(t,"r",1);
        else if(!"carry".equals(t.opt("kind"))||t.has("r"))throw new JSONException("Invalid target kind");
    }
    private static void validatePresentation(JSONObject p)throws JSONException{
        onlyKeys(p,"calculator","phase","tutorial","guideLevel","entry");worksheetFlags(p,"tutorial");worksheetInt(p,"guideLevel",2);
        if(!Arrays.asList("connect","calculate","carry","place","add","complete").contains(p.opt("phase")))throw new JSONException("Invalid view phase");
        JSONObject e=p.getJSONObject("entry");onlyKeys(e,"selected","value","feedback","level","hintTargets");worksheetTarget(e.get("selected"));worksheetText(e,"value",1);worksheetText(e,"feedback",240);worksheetInt(e,"level",3);
        if(!e.getString("value").matches("[0-9]?"))throw new JSONException("Invalid entry");
        org.json.JSONArray targets=e.getJSONArray("hintTargets");if(targets.length()>2)throw new JSONException("Too many targets");for(int i=0;i<targets.length();i++){if(targets.isNull(i))throw new JSONException("Missing target");worksheetTarget(targets.get(i));}
        JSONObject c=p.getJSONObject("calculator");onlyKeys(c,"mode","expression","display","carryEquation","golden","manual","offered","multiplier","tray","status","placementError","generate","active","guide");
        if(Arrays.asList("sum","complete").contains(c.opt("mode"))){if(c.length()!=1)throw new JSONException("Unexpected calculator fields");return;}
        if(!"fact".equals(c.opt("mode")))throw new JSONException("Invalid calculator mode");
        worksheetText(c,"expression",20);worksheetText(c,"display",2);worksheetText(c,"carryEquation",32);worksheetText(c,"status",240);
        if(!c.getString("display").matches("[0-9]{1,2}|[?\u2014]")||worksheetInt(c,"multiplier",15)<1)throw new JSONException("Invalid calculator value");
        worksheetFlags(c,"golden","manual","offered","placementError","generate","active","guide");
        if(!c.has("tray"))throw new JSONException("Missing tray");if(c.isNull("tray"))return;
        JSONObject t=c.getJSONObject("tray");onlyKeys(t,"waiting","armed","label","digits","selected","demo","demoDigit");worksheetInt(t,"waiting",9);worksheetFlags(t,"armed","demo");worksheetText(t,"demoDigit",1);
        if(!t.getString("demoDigit").matches("[0-9]?")||!Arrays.asList("Add the waiting carry","Place the digits").contains(t.opt("label"))||!t.has("selected")||!t.isNull("selected")&&!Arrays.asList("ones","tens").contains(t.opt("selected")))throw new JSONException("Invalid tray");
        org.json.JSONArray digits=t.getJSONArray("digits");if(digits.length()>2)throw new JSONException("Too many tray digits");Set<String> parts=new HashSet<>();
        for(int i=0;i<digits.length();i++){JSONObject d=digits.getJSONObject(i);onlyKeys(d,"part","value");worksheetInt(d,"value",9);String part=d.getString("part");if(!Arrays.asList("ones","tens").contains(part)||!parts.add(part))throw new JSONException("Invalid digit part");}
    }
    private static void positiveVersion(JSONObject h,String key)throws JSONException{
        Object value=h.opt(key);if(!(value instanceof Number)||h.getDouble(key)!=h.getLong(key)||h.getLong(key)<1||h.getLong(key)>9007199254740991L)throw new JSONException("Invalid synchronization version");
    }
    private static void validateHelp(JSONObject h)throws JSONException{
        String kind=h.getString("kind");
        switch(kind){
            case "reward-context":
                onlyKeys(h,"kind","context");JSONObject context=h.getJSONObject("context");
                onlyKeys(context,"id","sessionId","orderId","a","b","tier","bases","legacy","quote");
                if(context.has("quote"))positiveVersion(context,"quote");
                id(context,"id");id(context,"sessionId");positiveVersion(context,"orderId");
                if(worksheetInt(context,"a",99999)<1||worksheetInt(context,"b",99)<1)throw new JSONException("Invalid reward operands");
                worksheetInt(context,"tier",7);worksheetFlags(context,"legacy");rewardAmounts(context.getJSONArray("bases"),3,true);return;
            case "reward-credit":case "reward-suggested":
                onlyKeys(h,"kind","id","credit");id(h,"id");validateRewardCredit(h.getJSONObject("credit"));return;
            case "reward-earned":
                onlyKeys(h,"kind","id","contextId","credit","base","ordinal","proof");id(h,"id");id(h,"contextId");validateRewardCredit(h.getJSONObject("credit"));positiveVersion(h,"base");
                if(worksheetInt(h,"ordinal",5)<1||!h.has("proof"))throw new JSONException("Invalid earned receipt");
                if(!h.isNull("proof")){JSONObject earnedProof=h.getJSONObject("proof");onlyKeys(earnedProof,"schema","state","presentation");int earnedSchema=worksheetInt(earnedProof,"schema",2);if(earnedSchema<1||earnedSchema==1&&earnedProof.has("presentation"))throw new JSONException("Invalid earned proof schema");if(earnedSchema==2)validatePresentation(earnedProof.getJSONObject("presentation"));validateWorksheet(earnedProof.getJSONObject("state"));}return;
            case "reward-ack":onlyKeys(h,"kind","id");id(h,"id");return;
            case "reward-settle":
                onlyKeys(h,"kind","id","credits","denominations","proof","shares");id(h,"id");
                org.json.JSONArray credits=h.getJSONArray("credits");if(credits.length()<1||credits.length()>5)throw new JSONException("Invalid reward credits");
                Set<String> credited=new HashSet<>();for(int i=0;i<credits.length();i++){JSONObject credit=credits.getJSONObject(i);validateRewardCredit(credit);if(!credited.add(credit.getString("step")))throw new JSONException("Duplicate reward credit");}
                rewardAmounts(h.getJSONArray("denominations"),10,false);
                org.json.JSONArray shares=h.getJSONArray("shares");if(shares.length()<1||shares.length()>5)throw new JSONException("Invalid reward shares");
                int totalCredits=0;Set<String> helpers=new HashSet<>();for(int i=0;i<shares.length();i++){JSONObject share=shares.getJSONObject(i);onlyKeys(share,"helperId","count");id(share,"helperId");int count=worksheetInt(share,"count",5);if(count<1||!helpers.add(share.getString("helperId")))throw new JSONException("Invalid helper share");totalCredits+=count;}
                if(totalCredits>5)throw new JSONException("Reward cap exceeded");
                JSONObject proof=h.getJSONObject("proof");onlyKeys(proof,"schema","state","presentation");
                int proofSchema=worksheetInt(proof,"schema",2);if(proofSchema<1||proofSchema==1&&proof.has("presentation"))throw new JSONException("Invalid proof schema");
                if(proofSchema==2)validatePresentation(proof.getJSONObject("presentation"));validateWorksheet(proof.getJSONObject("state"));return;
            case "point":case "hint":
                onlyKeys(h,"kind","sessionId","streamId","recipientId","cueToken","sequence","stateVersion","point".equals(kind)?"target":"hint");
                for(String key:Arrays.asList("sessionId","streamId","recipientId","cueToken"))id(h,key);
                positiveVersion(h,"stateVersion");
                if(!(h.opt("sequence") instanceof Number)||h.getDouble("sequence")!=h.getLong("sequence")||h.getLong("sequence")<1||h.getLong("sequence")>9007199254740991L)throw new JSONException("Invalid guidance sequence");
                if("point".equals(kind)){
                    if(!(h.opt("target") instanceof String)||!h.getString("target").matches("(?:(?:top|bottom|carry|sum):[0-6]|slot:[01]:[0-6]|calculator:(?:product|tray|ones|tens|carry)|control:(?:generate|undo|add|challenge))"))throw new JSONException("Invalid semantic target");
                }else if(!(h.opt("hint") instanceof String)||!Arrays.asList("ones","carry","next","place","add","retry").contains(h.getString("hint")))throw new JSONException("Invalid procedural hint");
                return;
            case "resume":
                onlyKeys(h,"kind","sessionId","previousSession");id(h,"sessionId");id(h,"previousSession");return;
            case "watch":
                onlyKeys(h,"kind","sessionId","streamId","watchVersion","previousSession");id(h,"sessionId");id(h,"streamId");positiveVersion(h,"watchVersion");if(h.has("previousSession"))id(h,"previousSession");return;
            case "worksheet":
                onlyKeys(h,"kind","sessionId","streamId","watchVersion","version","snapshot","cueToken");id(h,"sessionId");id(h,"streamId");positiveVersion(h,"watchVersion");if(h.has("cueToken"))id(h,"cueToken");
                if(!(h.opt("version") instanceof Number)||h.getDouble("version")!=h.getLong("version")||h.getLong("version")<1||h.getLong("version")>9007199254740991L)throw new JSONException("Invalid worksheet version");
                JSONObject snapshot=h.getJSONObject("snapshot");onlyKeys(snapshot,"schema","state","presentation");
                int schema=worksheetInt(snapshot,"schema",2);if(schema<1||schema==1&&snapshot.has("presentation"))throw new JSONException("Invalid worksheet schema");
                if(schema==2)validatePresentation(snapshot.getJSONObject("presentation"));
                validateWorksheet(snapshot.getJSONObject("state"));return;
            case "presence":
                onlyKeys(h,"kind","available","busy");
                if(!(h.opt("available") instanceof Boolean)||!(h.opt("busy") instanceof Boolean))throw new JSONException("Invalid availability");
                return;
            case "end":onlyKeys(h,"kind","sessionId");id(h,"sessionId");return;
            case "invite":
                onlyKeys(h,"kind","requestId","expiresAt");id(h,"requestId");
                if(!(h.opt("expiresAt") instanceof Number)||h.getDouble("expiresAt")!=h.getLong("expiresAt")||h.getLong("expiresAt")<=0)throw new JSONException("Invalid invitation expiry");
                return;
            case "accept":case "decline":case "cancel":
                onlyKeys(h,"kind","requestId");id(h,"requestId");return;
            case "assigned":
                onlyKeys(h,"kind","requestId","sessionId","helperId");id(h,"requestId");id(h,"sessionId");id(h,"helperId");return;
            case "unavailable":
                onlyKeys(h,"kind","requestId","reason");id(h,"requestId");
                if(!Arrays.asList("taken","expired","canceled","busy","invalid").contains(h.getString("reason")))throw new JSONException("Invalid reason");
                return;
            default:throw new JSONException("Unknown help message");
        }
    }
    // Schema compatibility only; receipt verification and settlement remain in
    // the existing JavaScript owners. No LAN discovery or routing changes.
    private static void validateRewardCredit(JSONObject credit)throws JSONException{
        onlyKeys(credit,"step","sessionId","streamId","cueToken","sequence");
        for(String key:Arrays.asList("sessionId","streamId","cueToken"))id(credit,key);positiveVersion(credit,"sequence");
        if(!(credit.opt("step") instanceof String)||!credit.getString("step").matches("(?:[01]:[0-4]:(?:connect|reveal|carry-down|carry-up|place-ones|place-tens)|complete)"))throw new JSONException("Invalid reward step");
    }
    private static void rewardAmounts(org.json.JSONArray values,int max,boolean positive)throws JSONException{
        if(values.length()<1||values.length()>max)throw new JSONException("Invalid reward amounts");
        for(int i=0;i<values.length();i++){Object v=values.opt(i);if(!(v instanceof Number))throw new JSONException("Invalid reward amount type");double n=values.getDouble(i);if(Double.isNaN(n)||Double.isInfinite(n)||n<0||positive&&n==0||n>9007199254740991d)throw new JSONException("Invalid reward amount");}
    }
    private static JSONObject parse(String text)throws JSONException{
        if(text==null||text.length()>8192)throw new JSONException("Message too large");JSONObject m=new JSONObject(text),p=m.getJSONObject("player");
        Set<String> keys=new HashSet<>(Arrays.asList("v","id","session","player","type","replyTo","coord","help"));Iterator<String> it=m.keys();while(it.hasNext())if(!keys.contains(it.next()))throw new JSONException("Unknown field");
        for(String key:Arrays.asList("id","session","type"))if(!(m.opt(key) instanceof String))throw new JSONException("Invalid field type");
        for(String key:Arrays.asList("id","name","number"))if(!(p.opt(key) instanceof String))throw new JSONException("Invalid profile type");
        if(!(m.opt("v") instanceof Number)||m.getDouble("v")!=1.0||m.has("replyTo")&&(!(m.opt("replyTo") instanceof String)||!m.getString("replyTo").matches("[a-f0-9]{32}")))throw new JSONException("Invalid version or reply");
        String name=p.getString("name");if(!java.text.Normalizer.isNormalized(name,java.text.Normalizer.Form.NFC)||!name.equals(name.trim())||name.matches("(?s).*[\\x00-\\x1f\\x7f-\\x9f\\u202a-\\u202e\\u2066-\\u2069].*"))throw new JSONException("Invalid name");
        if(p.length()!=3||!p.has("id")||!p.has("name")||!p.has("number")||m.getInt("v")!=1||!m.getString("id").matches("[a-f0-9]{32}")||!m.getString("session").matches("[a-f0-9]{32}")||!p.getString("id").matches("[a-f0-9]{32}")||!p.getString("number").matches("[0-9]{4}")||p.getString("name").trim().isEmpty()||p.getString("name").length()>24||!Arrays.asList("hello","test","reply","coord","help").contains(m.getString("type"))||"reply".equals(m.getString("type"))&&!m.getString("replyTo").matches("[a-f0-9]{32}"))throw new JSONException("Invalid protocol");
        if(m.has("replyTo")&&!"reply".equals(m.getString("type")))throw new JSONException("Unexpected reply");
        if("coord".equals(m.getString("type")))validateCoordinator(m.getJSONObject("coord"));
        else if(m.has("coord"))throw new JSONException("Unexpected coordinator data");
        if("help".equals(m.getString("type")))validateHelp(m.getJSONObject("help"));
        else if(m.has("help"))throw new JSONException("Unexpected help data");
        return m;
    }
}
