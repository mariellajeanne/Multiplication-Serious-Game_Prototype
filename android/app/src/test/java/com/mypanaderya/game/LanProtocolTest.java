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
        JSONObject h=new JSONObject().put("kind","watch").put("sessionId","d".repeat(32)).put("streamId","e".repeat(32));
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
    @Test public void guidanceIsBoundedAndNeverContainsCommandsOrFreeText() throws Exception {
        JSONObject h=new JSONObject().put("kind","point").put("sessionId","d".repeat(32)).put("streamId","e".repeat(32))
            .put("recipientId","f".repeat(32)).put("cueToken","a".repeat(32)).put("sequence",1).put("target","carry:1");
        JSONObject m=hello().put("type","help").put("help",h);parse(m.toString());
        for(String target:new String[]{"slot:0:0","calculator:product","calculator:carry","control:undo"}){h.put("target",target);parse(m.toString());}
        for(Object target:new Object[]{"slot:9:0","#math","top:7",new JSONArray().put("top:0")}){h.put("target",target);rejects(m);}
        h.remove("target");h.put("kind","hint").put("hint","carry");parse(m.toString());
        h.put("hint","The answer is 72");rejects(m);h.put("hint",new JSONArray().put("carry"));rejects(m);h.put("hint","carry");
        h.put("sequence",0);rejects(m);h.put("sequence","1");rejects(m);h.put("sequence",1);
        h.put("recipientId","invalid");rejects(m);h.put("recipientId","f".repeat(32));
        h.put("command","undo");rejects(m);
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
}
