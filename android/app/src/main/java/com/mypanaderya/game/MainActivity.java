package com.mypanaderya.game;

import android.app.Activity;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.*;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;

public final class MainActivity extends Activity {
    private WebView web;
    private LanDiscovery lan;
    private NearbyDiscovery nearby;
    private boolean destroyed;
    static boolean isGameUrl(Uri url) {
        return "https".equals(url.getScheme()) && "appassets.androidplatform.net".equals(url.getHost())
            && url.getPort() == -1 && url.getUserInfo() == null && url.getPath() != null
            && url.getPath().startsWith("/assets/game/");
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder().addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = isGameUrl(request.getUrl()) ? assets.shouldInterceptRequest(request.getUrl()) : null;
                return response != null ? response : new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isGameUrl(request.getUrl());
            }
        });
        lan = new LanDiscovery(this, json -> runOnUiThread(() -> {
            if(destroyed)return;
            String literal=JSONObject.quote(json).replace("\u2028","\\u2028").replace("\u2029","\\u2029");
            web.evaluateJavascript("window.dispatchEvent(new CustomEvent('co-baker-native',{detail:JSON.parse(" + literal + ")}))", null);
        }));
        web.addJavascriptInterface(lan, "PanaderyaLan");
        nearby = new NearbyDiscovery(this, json -> runOnUiThread(() -> {
            if(destroyed)return;
            String literal=JSONObject.quote(json).replace("\u2028","\\u2028").replace("\u2029","\\u2029");
            web.evaluateJavascript("window.dispatchEvent(new CustomEvent('co-baker-nearby',{detail:JSON.parse("+literal+")}))",null);
        }));
        web.addJavascriptInterface(nearby,"PanaderyaNearby");
        setContentView(web);
        web.loadUrl("https://appassets.androidplatform.net/assets/game/index.html" + (BuildConfig.DEBUG ? "?cobaker=debug" : ""));
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results){super.onRequestPermissionsResult(requestCode,permissions,results);if(requestCode==NearbyDiscovery.PERMISSIONS)nearby.permissionsResult();}
    @Override protected void onResume() { super.onResume(); if(lan != null)lan.resume(); if(nearby != null)nearby.resume(); if(web!=null)web.evaluateJavascript("window.dispatchEvent(new Event('co-baker-resume'))",null); }
    @Override protected void onPause() { if(web != null)web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))",null); if(lan != null)lan.pause(); if(nearby != null)nearby.pause(); super.onPause(); }
    @Override protected void onDestroy() { destroyed=true;lan.destroy();nearby.destroy();web.removeJavascriptInterface("PanaderyaLan");web.removeJavascriptInterface("PanaderyaNearby");web.destroy();super.onDestroy(); }
}
