package com.mypanaderya.game;

import org.json.*;
import org.junit.Test;
import java.lang.reflect.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import static org.junit.Assert.*;

/** JVM tests of the actual native validator; no device/discovery success implied. */
public class LanProtocolTest {
    private JSONObject hello() throws Exception {
        return new JSONObject().put("v",1).put("id","a".repeat(32)).put("session","b".repeat(32)).put("type","hello")
            .put("player",new JSONObject().put("id","c".repeat(32)).put("name","Baker").put("number","0073"));
    }
    private JSONObject parse(String json) throws Exception {
        Method method=LanDiscovery.class.getDeclaredMethod("parse",String.class);method.setAccessible(true);
        try{return (JSONObject)method.invoke(null,json);}catch(InvocationTargetException e){throw (Exception)e.getCause();}
    }
    private void rejects(JSONObject message) throws Exception {
        try{parse(message.toString());fail("Malformed message accepted");}catch(JSONException expected){}
    }
    @Test public void validLeadingZerosAndReply() throws Exception {
        assertEquals("0073",parse(hello().toString()).getJSONObject("player").getString("number"));
        assertEquals("reply",parse(hello().put("type","reply").put("replyTo","d".repeat(32)).toString()).getString("type"));
    }
    @Test public void rejectsCoercionAndUnexpectedPayload() throws Exception {
        rejects(hello().put("v","1"));rejects(hello().put("v",1.5));rejects(hello().put("coins",123));
        JSONObject m=hello();m.getJSONObject("player").put("number",73);rejects(m);
        rejects(hello().put("session",new JSONArray().put("b".repeat(32))));
    }
    @Test public void rejectsInvalidNamesAndVersions() throws Exception {
        rejects(hello().put("v",2));rejects(hello().put("type","worksheet"));
        for(String name:new String[]{""," Baker","Baker\n","A\u202eB","a".repeat(25)}){JSONObject m=hello();m.getJSONObject("player").put("name",name);rejects(m);}
    }
    @Test public void coordinatorMessagesAreBoundedAndNeverGameCommands() throws Exception {
        JSONObject m=hello().put("type","coord").put("coord",new JSONObject().put("kind","probe"));
        assertEquals("coord",parse(m.toString()).getString("type"));
        JSONObject state=new JSONObject().put("kind","state").put("replyTo","e".repeat(32)).put("term",3)
            .put("leader",new JSONObject().put("id","c".repeat(32)).put("session","b".repeat(32)).put("term",3));
        m.put("coord",state);parse(m.toString());state.put("term","3");rejects(m);state.put("term",3);
        state.getJSONObject("leader").put("term",4);rejects(m);state.put("leader",JSONObject.NULL);parse(m.toString());
        state.put("coins",99);rejects(m);
        rejects(hello().put("type","coord").put("coord",new JSONObject().put("kind","help")));
        rejects(hello().put("coord",new JSONObject().put("kind","probe")));
    }
    @Test public void rejectsBadRepliesAndOversizedFrames() throws Exception {
        rejects(hello().put("type","reply"));rejects(hello().put("replyTo","bad"));
        try{parse(" ".repeat(8193));fail("Oversized frame accepted");}catch(JSONException expected){}
    }
    @Test public void observationUsesBoundedDataOnlyHelpMessages() throws Exception {
        JSONObject h=new JSONObject().put("kind","watch").put("watchVersion",1).put("sessionId","d".repeat(32)).put("streamId","e".repeat(32));
        JSONObject m=hello().put("type","help").put("help",h);parse(m.toString());
        h.put("previousSession","f".repeat(32));parse(m.toString());h.put("command","undo");rejects(m);h.remove("command");
        h.put("kind","worksheet").remove("previousSession");h.put("version",1);
        JSONObject state=new JSONObject("{\"a\":79,\"b\":18,\"A\":[9,7],\"B\":[8,1],\"cols\":4,\"row\":0,\"k\":0,\"first\":null,\"phase\":\"select\",\"revealed\":false,\"raw\":0,\"mixed\":false,\"incoming\":0,\"onesPlaced\":false,\"tensPlaced\":false,\"tensLocation\":null,\"chosen\":null,\"carrySlots\":{},\"rows\":[{},{\"0\":0}],\"sum\":{},\"sumCol\":0,\"sumCarry\":0,\"done\":0,\"boxes\":0,\"complete\":false,\"carryArmed\":false}");
        h.put("snapshot",new JSONObject().put("schema",1).put("state",state));parse(m.toString());
        JSONObject presentation=new JSONObject("{\"calculator\":{\"mode\":\"sum\"},\"phase\":\"add\",\"tutorial\":true,\"guideLevel\":2,\"entry\":{\"selected\":null,\"value\":\"\",\"feedback\":\"\",\"level\":0,\"hintTargets\":[]}}");
        h.getJSONObject("snapshot").put("schema",2).put("presentation",presentation);parse(m.toString());
        JSONObject calc=new JSONObject("{\"mode\":\"fact\",\"expression\":\"9 x 8\",\"display\":\"72\",\"carryEquation\":\"\",\"golden\":true,\"manual\":false,\"offered\":false,\"multiplier\":3,\"status\":\"Place the digits.\",\"placementError\":false,\"generate\":false,\"active\":true,\"guide\":false,\"tray\":{\"waiting\":0,\"armed\":false,\"label\":\"Place the digits\",\"digits\":[{\"part\":\"tens\",\"value\":7},{\"part\":\"ones\",\"value\":2}],\"selected\":null,\"demo\":false,\"demoDigit\":\"2\"}}");
        presentation.put("calculator",calc);parse(m.toString());calc.put("generate","false");rejects(m);calc.put("generate",false);calc.getJSONObject("tray").getJSONArray("digits").put(1,JSONObject.NULL);rejects(m);calc.getJSONObject("tray").getJSONArray("digits").put(1,new JSONObject().put("part","ones").put("value",2));parse(m.toString());
        presentation.put("coins",99);rejects(m);presentation.remove("coins");
        presentation.getJSONObject("entry").put("selected",new JSONObject().put("kind","slot").put("r",7).put("c",0));rejects(m);presentation.getJSONObject("entry").put("selected",JSONObject.NULL);
        state.put("coins",10);rejects(m);state.remove("coins");state.put("phase","<script>");rejects(m);
        state.put("phase","select");h.put("version",0);rejects(m);h.put("version","1");rejects(m);
    }
    @Test public void productionWorksheetPresentationIsAcceptedForLanAndNearby() throws Exception {
        // This is the actual Phase 3/4 envelope shape, including fields the
        // previous native validator rejected while browser relay accepted.
        JSONObject state=new JSONObject("{\"a\":79,\"b\":18,\"A\":[9,7],\"B\":[8,1],\"cols\":4,\"row\":0,\"k\":0,\"first\":null,\"phase\":\"product\",\"revealed\":false,\"raw\":72,\"mixed\":false,\"incoming\":0,\"onesPlaced\":false,\"tensPlaced\":false,\"tensLocation\":null,\"chosen\":null,\"carrySlots\":{},\"rows\":[{},{\"0\":0}],\"sum\":{},\"sumCol\":0,\"sumCarry\":0,\"done\":0,\"boxes\":0,\"complete\":false,\"carryArmed\":false}");
        state.put("expressionOrder",new JSONArray().put(8).put(9)).put("expressionActivated",true).put("goldenOffer",false);
        JSONObject calc=new JSONObject("{\"mode\":\"fact\",\"expression\":\"8 × 9\",\"display\":\"?\",\"carryEquation\":\"\",\"golden\":false,\"manual\":false,\"offered\":false,\"multiplier\":1,\"tray\":null,\"status\":\"Choose how to find the answer.\",\"placementError\":false,\"generate\":true,\"active\":true,\"guide\":true}");
        JSONObject presentation=new JSONObject().put("calculator",calc).put("phase","calculate").put("tutorial",true).put("guideLevel",2)
            .put("entry",new JSONObject().put("selected",JSONObject.NULL).put("value","").put("feedback","").put("level",0).put("hintTargets",new JSONArray()))
            .put("order",new JSONObject().put("foodId","pandesal").put("sprite",1))
            .put("rewards",new JSONArray().put(new JSONObject().put("rank",0).put("name","Coin Stack").put("chance",0.6).put("base",100).put("count",0)));
        JSONObject snapshot=new JSONObject().put("schema",2).put("state",state).put("presentation",presentation);
        JSONObject packet=hello().put("type","help").put("help",new JSONObject().put("kind","worksheet").put("sessionId","d".repeat(32))
            .put("streamId","e".repeat(32)).put("watchVersion",1).put("version",1).put("cueToken","f".repeat(32)).put("snapshot",snapshot));
        assertEquals("worksheet",parse(packet.toString()).getJSONObject("help").getString("kind"));
        state.put("expressionActivated","false");rejects(packet);state.put("expressionActivated",true);
        state.getJSONArray("expressionOrder").put(0,10);rejects(packet);state.getJSONArray("expressionOrder").put(0,8);
        presentation.getJSONObject("order").put("sprite",99);rejects(packet);presentation.getJSONObject("order").put("sprite",1);
        presentation.getJSONArray("rewards").getJSONObject(0).put("chance",1.2);rejects(packet);presentation.getJSONArray("rewards").getJSONObject(0).put("chance",0.6);
        presentation.getJSONArray("rewards").getJSONObject(0).put("coins",100000);rejects(packet);
    }
    @Test public void guidanceIsBoundedAndNeverContainsCommandsOrFreeText() throws Exception {
        JSONObject h=new JSONObject().put("kind","point").put("sessionId","d".repeat(32)).put("streamId","e".repeat(32))
            .put("recipientId","f".repeat(32)).put("cueToken","a".repeat(32)).put("sequence",1).put("stateVersion",1).put("target","carry:1");
        JSONObject m=hello().put("type","help").put("help",h);parse(m.toString());
        for(String target:new String[]{"slot:0:0","calculator:product","calculator:carry","control:undo"}){h.put("target",target);parse(m.toString());}
        for(Object target:new Object[]{"slot:9:0","#math","top:7",new JSONArray().put("top:0")}){h.put("target",target);rejects(m);}
        h.remove("target");h.put("kind","hint").put("hint","carry");parse(m.toString());
        h.put("hint","The answer is 72");rejects(m);h.put("hint",new JSONArray().put("carry"));rejects(m);h.put("hint","carry");
        h.put("sequence",0);rejects(m);h.put("sequence","1");rejects(m);h.put("sequence",1);
        h.put("recipientId","invalid");rejects(m);h.put("recipientId","f".repeat(32));
        h.put("command","undo");rejects(m);
    }
    @Test public void recoveryAndSynchronizationVersionsAreStrictlyBounded() throws Exception {
        JSONObject h=new JSONObject().put("kind","resume").put("sessionId","d".repeat(32)).put("previousSession","e".repeat(32));
        JSONObject m=hello().put("type","help").put("help",h);parse(m.toString());
        h.put("snapshot",new JSONObject());rejects(m);h.remove("snapshot");h.put("previousSession","bad");rejects(m);h.put("previousSession","e".repeat(32));
        h.put("kind","watch").put("streamId","f".repeat(32)).put("watchVersion",1);parse(m.toString());
        for(Object v:new Object[]{0,-1,1.5,"1",9007199254740992L}){h.put("watchVersion",v);rejects(m);}
        h.remove("watchVersion");rejects(m);
        h=new JSONObject().put("kind","hint").put("sessionId","d".repeat(32)).put("streamId","e".repeat(32)).put("recipientId","f".repeat(32)).put("cueToken","a".repeat(32)).put("sequence",1).put("hint","carry").put("stateVersion",1);
        m.put("help",h);parse(m.toString());h.remove("stateVersion");rejects(m);h.put("stateVersion","1");rejects(m);
    }
    @Test public void helperRewardsUseBoundedReceiptsWithoutRemoteCommands() throws Exception {
        JSONObject credit=new JSONObject().put("step","0:0:connect").put("sessionId","d".repeat(32)).put("streamId","e".repeat(32)).put("cueToken","f".repeat(32)).put("sequence",1);
        JSONObject h=new JSONObject().put("kind","reward-credit").put("id","a".repeat(32)).put("credit",credit);
        JSONObject m=hello().put("type","help").put("help",h);parse(m.toString());
        credit.put("step","answer:72");rejects(m);credit.put("step","0:0:connect");credit.put("sequence","1");rejects(m);credit.put("sequence",1);
        h.put("coins",999);rejects(m);h.remove("coins");
        JSONObject context=new JSONObject().put("id","a".repeat(32)).put("sessionId","d".repeat(32)).put("orderId",41).put("a",79).put("b",18).put("tier",1).put("bases",new JSONArray().put(100).put(176).put(310)).put("legacy",false);
        h=new JSONObject().put("kind","reward-context").put("context",context);m.put("help",h);parse(m.toString());
        context.put("legacy","false");rejects(m);context.put("legacy",false);context.getJSONArray("bases").put(0,"100");rejects(m);context.getJSONArray("bases").put(0,100);
        JSONObject state=new JSONObject("{\"a\":79,\"b\":18,\"A\":[9,7],\"B\":[8,1],\"cols\":4,\"row\":1,\"k\":2,\"first\":null,\"phase\":\"complete\",\"revealed\":false,\"raw\":0,\"mixed\":false,\"incoming\":0,\"onesPlaced\":false,\"tensPlaced\":false,\"tensLocation\":null,\"chosen\":null,\"carrySlots\":{},\"rows\":[{\"0\":2,\"1\":3,\"2\":6},{\"0\":0,\"1\":9,\"2\":7}],\"sum\":{\"0\":2,\"1\":2,\"2\":4,\"3\":1},\"sumCol\":4,\"sumCarry\":0,\"done\":4,\"boxes\":4,\"complete\":true,\"carryArmed\":false}");
        h=new JSONObject().put("kind","reward-settle").put("id","a".repeat(32)).put("credits",new JSONArray().put(credit)).put("denominations",new JSONArray().put(176).put(100).put(310).put(176)).put("proof",new JSONObject().put("schema",1).put("state",state)).put("shares",new JSONArray().put(new JSONObject().put("helperId","f".repeat(32)).put("count",1)));m.put("help",h);parse(m.toString());
        h.getJSONArray("credits").put(credit);rejects(m);h.put("credits",new JSONArray().put(credit));h.put("command","place");rejects(m);
        m.put("help",new JSONObject().put("kind","reward-ack").put("id","a".repeat(32)));parse(m.toString());
        h=new JSONObject().put("kind","reward-suggested").put("id","a".repeat(32)).put("credit",credit);m.put("help",h);parse(m.toString());
        h=new JSONObject().put("kind","reward-earned").put("id","b".repeat(32)).put("contextId","a".repeat(32)).put("credit",credit).put("base",856).put("ordinal",1).put("proof",new JSONObject().put("schema",1).put("state",state));m.put("help",h);parse(m.toString());
        h.put("proof",JSONObject.NULL);parse(m.toString());h.put("ordinal",6);rejects(m);h.put("ordinal",1);h.put("base","856");rejects(m);h.put("base",856);h.put("coins",99);rejects(m);
    }
    private String readFrame(byte[] bytes) throws Exception {
        try(ServerSocket server=new ServerSocket(0,1,InetAddress.getLoopbackAddress());
            Socket writer=new Socket(InetAddress.getLoopbackAddress(),server.getLocalPort());
            Socket reader=server.accept()){
            writer.getOutputStream().write(bytes);writer.shutdownOutput();reader.setSoTimeout(1000);
            Method method=LanDiscovery.class.getDeclaredMethod("read",Socket.class);method.setAccessible(true);
            try{return (String)method.invoke(null,reader);}catch(InvocationTargetException e){throw (Exception)e.getCause();}
        }
    }
    @Test public void readsNativeUtf8FramesOverJvmLoopbackTcp() throws Exception {
        String message=hello().toString();assertEquals(message,readFrame((message+"\n").getBytes(StandardCharsets.UTF_8)));
    }
    @Test public void rejectsTruncatedOversizedAndInvalidUtf8TcpFrames() throws Exception {
        for(byte[] bytes:new byte[][]{"no newline".getBytes(StandardCharsets.UTF_8),("x".repeat(8193)+"\n").getBytes(StandardCharsets.UTF_8),new byte[]{(byte)0xc3,0x28,0x0a}}){
            try{readFrame(bytes);fail("Malformed frame accepted");}catch(IOException expected){}
        }
    }
    @Test public void dualStackDiscoverySelectsTheLocalIpv4ListenerAddress() throws Exception {
        InetAddress local=InetAddress.getByName("192.168.1.10");
        assertEquals(local,LanDiscovery.localIpv4(Arrays.asList(InetAddress.getByName("fe80::1"),local)));
        assertNull(LanDiscovery.localIpv4(Arrays.asList(InetAddress.getByName("::1"),InetAddress.getByName("8.8.8.8"))));
    }
    @Test public void remoteSamePortIsNotSelfAndSelfNeedsBothAddressAndPort()throws Exception{
        InetAddress tablet=InetAddress.getByName("192.168.88.4"),phone=InetAddress.getByName("192.168.88.2");
        assertTrue(LanDiscovery.candidateDecision(tablet,43000,tablet,43000).startsWith("SELF"));
        assertTrue(LanDiscovery.candidateDecision(tablet,43000,phone,43000).startsWith("REMOTE"));
        assertTrue(LanDiscovery.candidateDecision(tablet,43000,tablet,43001).startsWith("REMOTE"));
        assertTrue(LanDiscovery.candidateDecision(tablet,43000,null,43000).startsWith("REJECTED"));
        assertTrue(LanDiscovery.candidateDecision(tablet,43000,phone,0).startsWith("REJECTED"));
    }
    @Test public void ipv6OnlyResolutionCannotBecomeAnIpv4Candidate()throws Exception{
        assertNull(LanDiscovery.localIpv4(Arrays.asList(InetAddress.getByName("fe80::123"))));
        assertEquals(InetAddress.getByName("192.168.88.2"),LanDiscovery.localIpv4(Arrays.asList(null,InetAddress.getByName("192.168.88.2"))));
    }
    @Test public void probeAcceptsOnlyExplicitPrivateIpv4AndValidPort()throws Exception{
        assertEquals("192.168.88.2",LanDiscovery.probeAddress("192.168.88.2",43000).getHostAddress());
        for(String host:new String[]{"example.com","127.0.0.1","8.8.8.8","::1","192.168.88.999"}){
            try{LanDiscovery.probeAddress(host,43000);fail("Bad probe accepted");}catch(IOException expected){}
        }
        try{LanDiscovery.probeAddress("192.168.88.2",65536);fail("Bad port accepted");}catch(IOException expected){}
    }
    @Test public void diagnosticCopyIncludesHiddenDetailsButOmitsPrivateSummaryFields()throws Exception{
        JSONObject summary=new JSONObject().put("Transport","Android Native").put("Status","searching").put("password","SECRET_PASSWORD").put("token","SECRET_TOKEN").put("id","a".repeat(32));
        JSONObject details=new JSONObject().put("Last error","test failure").put("Offscreen candidate","192.168.88.2:43000").put("Diagnostic revision","classroom-audit-1").put("Call error","b".repeat(32));
        String report=LanDiscovery.diagnosticReport(summary.toString(),details.toString());
        assertTrue(report.contains("Offscreen candidate: 192.168.88.2:43000"));assertTrue(report.contains("test failure"));assertTrue(report.contains("WLAN Partition"));
        assertFalse(report.contains("SECRET_PASSWORD"));assertFalse(report.contains("SECRET_TOKEN"));assertFalse(report.contains("a".repeat(32)));assertFalse(report.contains("b".repeat(32)));
    }
    @Test public void maintenanceDoesNotAccumulateDuplicateWorkAcrossSchedulerTicks(){
        java.util.ArrayDeque<Runnable> queue=new java.util.ArrayDeque<>();java.util.Set<Integer> pending=new java.util.HashSet<>();
        for(int tick=0;tick<20;tick++)for(int peer=0;peer<39;peer++)LanDiscovery.scheduleOnce(queue::add,pending,peer,()->{});
        assertEquals(39,queue.size());assertEquals(39,pending.size());
        while(!queue.isEmpty())queue.remove().run();assertTrue(pending.isEmpty());
        assertTrue(LanDiscovery.scheduleOnce(queue::add,pending,0,()->{}));
    }
    @Test public void rejectedAndFailedMaintenanceAlwaysReleaseTheirGuard(){
        java.util.Set<String> pending=new java.util.HashSet<>();
        assertFalse(LanDiscovery.scheduleOnce(task->{throw new java.util.concurrent.RejectedExecutionException();},pending,"peer",()->{}));assertTrue(pending.isEmpty());
        try{LanDiscovery.scheduleOnce(Runnable::run,pending,"peer",()->{throw new IllegalStateException("test");});fail("Expected task failure");}catch(IllegalStateException expected){}
        assertTrue(pending.isEmpty());
    }
}
