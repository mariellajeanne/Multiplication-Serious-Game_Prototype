package com.mypanaderya.game;
import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;
import java.util.Arrays;

public class NearbyDiscoveryTest {
    private JSONObject player(String id,String name)throws Exception{return new JSONObject().put("id",id).put("name",name).put("number","3720");}
    @Test public void android11RequestsLocationOnly(){assertEquals(2,NearbyDiscovery.permissions(30).length);assertTrue(Arrays.asList(NearbyDiscovery.permissions(30)).contains("android.permission.ACCESS_FINE_LOCATION"));}
    @Test public void android12RequestsBluetoothAndLocation(){assertEquals(5,NearbyDiscovery.permissions(31).length);}
    @Test public void android13RequestsNearbyWifiWithoutLocation(){String[] p=NearbyDiscovery.permissions(33);assertEquals(4,p.length);assertTrue(Arrays.asList(p).contains("android.permission.NEARBY_WIFI_DEVICES"));assertFalse(Arrays.asList(p).contains("android.permission.ACCESS_FINE_LOCATION"));}
    @Test public void advertisementPreservesPersistentIdentityAndOnlyBooleanStatus()throws Exception{
        JSONObject p=player("a".repeat(32),"Bea"),ad=NearbyDiscovery.profile(NearbyDiscovery.endpointName(p,true));
        assertEquals(p.getString("id"),ad.getString("id"));assertEquals(4,ad.length());assertTrue(ad.getBoolean("available"));assertFalse(ad.has("busy"));assertFalse(ad.has("worksheet"));
    }
    @Test public void duplicateVisibleNumbersRemainSeparateIdentities()throws Exception{
        JSONObject a=NearbyDiscovery.profile(NearbyDiscovery.endpointName(player("a".repeat(32),"Bea"),true)),b=NearbyDiscovery.profile(NearbyDiscovery.endpointName(player("b".repeat(32),"Bea"),false));
        assertEquals(a.getString("number"),b.getString("number"));assertNotEquals(a.getString("id"),b.getString("id"));assertFalse(b.getBoolean("available"));
    }
    @Test public void unicodeAdvertisementFitsByteBudget()throws Exception{assertTrue(NearbyDiscovery.endpointName(player("a".repeat(32),"麵".repeat(24)),true).getBytes(java.nio.charset.StandardCharsets.UTF_8).length<=131);}
    @Test public void rejectsMalformedMetadata(){for(String name:new String[]{"Bea #3720","a".repeat(32)+"|3720|solving|Bea","a".repeat(32)+"|3720|1|<\nBea"})try{NearbyDiscovery.profile(name);fail("Accepted invalid candidate");}catch(Exception expected){}}
    @Test public void nearbyUsesTheExistingStrictPacketValidator()throws Exception{
        JSONObject message=new JSONObject().put("v",1).put("id","a".repeat(32)).put("session","b".repeat(32)).put("player",player("c".repeat(32),"Bea")).put("type","help").put("help",new JSONObject().put("kind","presence").put("available",true));
        assertEquals("presence",LanDiscovery.parse(message.toString()).getJSONObject("help").getString("kind"));message.getJSONObject("help").put("worksheet","secret");try{LanDiscovery.parse(message.toString());fail("Accepted private status");}catch(org.json.JSONException expected){}
    }
    @Test public void invitationDeliveryAcknowledgementHasStrictNativeSchema()throws Exception{
        JSONObject message=new JSONObject().put("v",1).put("id","a".repeat(32)).put("session","b".repeat(32)).put("player",player("c".repeat(32),"Bea")).put("type","help").put("help",new JSONObject().put("kind","delivered").put("requestId","d".repeat(32)).put("expiresAt",15000));
        assertEquals("delivered",LanDiscovery.parse(message.toString()).getJSONObject("help").getString("kind"));
        message.getJSONObject("help").put("coins",99);try{LanDiscovery.parse(message.toString());fail("Accepted extra acknowledgement field");}catch(org.json.JSONException expected){}
        message.getJSONObject("help").remove("coins");message.getJSONObject("help").put("expiresAt",0);try{LanDiscovery.parse(message.toString());fail("Accepted invalid expiry");}catch(org.json.JSONException expected){}
    }
}
