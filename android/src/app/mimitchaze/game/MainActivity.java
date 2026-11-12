package app.mimitchaze.game;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.util.ArrayList;

/**
 * מעטפת לאתר המשחק: פותח את "מי המתחזה?" האונליין במסך מלא, עם מיקרופון (צ'אט קולי)
 * וגשר לזיהוי דיבור של אנדרואיד (כדי שהבוטים ישמעו אותך).
 */
public class MainActivity extends Activity {
    static final String HOME = "https://liav-melamud.github.io/mi-hamitchaze/";
    static final String HOST = "liav-melamud.github.io";

    private WebView web;
    private PermissionRequest pendingPermission;
    private SpeechRecognizer recognizer;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private long lastBack = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0b0e16"));
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setUserAgentString(s.getUserAgentString() + " MiHamitchazeApp/1");

        web.addJavascriptInterface(new SpeechBridge(), "AndroidSpeech");
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    boolean wantsAudio = false;
                    for (String r : request.getResources()) if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) wantsAudio = true;
                    if (!wantsAudio) { request.deny(); return; }
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
                    } else {
                        pendingPermission = request;
                        requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, 1);
                    }
                });
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (HOST.equals(u.getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* אין אפליקציה מתאימה */ }
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOffline();
            }
        });

        web.loadUrl(HOME);
    }

    private void showOffline() {
        String html = "<html dir='rtl'><body style='background:#0b0e16;color:#e9eef7;font-family:sans-serif;text-align:center;padding:40px'>"
                + "<h2>אין חיבור לאינטרנט</h2><p>המשחק עובד רק אונליין. בדוק את החיבור ונסה שוב.</p>"
                + "<p><a href='" + HOME + "' style='display:inline-block;padding:14px 28px;background:#ffb547;color:#1a1205;border-radius:12px;font-weight:bold;text-decoration:none'>נסה שוב</a></p>"
                + "</body></html>";
        web.loadDataWithBaseURL(HOME, html, "text/html", "utf-8", null);
    }

    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (pendingPermission != null) {
            boolean ok = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            if (ok) pendingPermission.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE});
            else pendingPermission.deny();
            pendingPermission = null;
        }
    }

    // ---------- מסך מלא ----------
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - lastBack < 2000) { finish(); return; }
        lastBack = now;
        Toast.makeText(this, "לחץ שוב כדי לצאת מהמשחק", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        if (recognizer != null) { recognizer.destroy(); recognizer = null; }
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    // ---------- זיהוי דיבור (גשר ל-JavaScript, כי WebView לא תומך ב-webkitSpeechRecognition) ----------
    private void js(String code) {
        if (web != null) web.evaluateJavascript(code, null);
    }

    private void silenceBeep() {
        try {
            final AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            am.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_MUTE, 0);
            am.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_MUTE, 0);
            ui.postDelayed(() -> {
                try {
                    am.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, 0);
                    am.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_UNMUTE, 0);
                } catch (Exception ignored) { }
            }, 900);
        } catch (Exception ignored) { }
    }

    private void startRecognition(String lang) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            js("window.__nsrError && window.__nsrError('not-allowed')");
            js("window.__nsrEnd && window.__nsrEnd()");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            js("window.__nsrError && window.__nsrError('service-not-allowed')");
            js("window.__nsrEnd && window.__nsrEnd()");
            return;
        }
        if (recognizer != null) recognizer.destroy();
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { }
            @Override public void onBeginningOfSpeech() { }
            @Override public void onRmsChanged(float rmsdB) { }
            @Override public void onBufferReceived(byte[] buffer) { }
            @Override public void onEndOfSpeech() { }
            @Override public void onEvent(int eventType, Bundle params) { }

            @Override
            public void onPartialResults(Bundle partialResults) { deliver(partialResults, false); }

            @Override
            public void onResults(Bundle results) {
                deliver(results, true);
                js("window.__nsrEnd && window.__nsrEnd()");
            }

            @Override
            public void onError(int error) {
                String code = null;
                if (error == SpeechRecognizer.ERROR_NETWORK || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) code = "network";
                else if (error == SpeechRecognizer.ERROR_AUDIO) code = "audio-capture";
                else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) code = "not-allowed";
                if (code != null) js("window.__nsrError && window.__nsrError(" + JSONObject.quote(code) + ")");
                js("window.__nsrEnd && window.__nsrEnd()");
            }

            private void deliver(Bundle b, boolean isFinal) {
                ArrayList<String> list = b == null ? null : b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (list == null || list.isEmpty()) return;
                js("window.__nsrResult && window.__nsrResult(" + JSONObject.quote(list.get(0)) + "," + isFinal + ")");
            }
        });
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang == null || lang.isEmpty() ? "he-IL" : lang);
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
        silenceBeep();
        recognizer.startListening(i);
    }

    public class SpeechBridge {
        @JavascriptInterface
        public boolean available() { return SpeechRecognizer.isRecognitionAvailable(MainActivity.this); }

        @JavascriptInterface
        public void start(final String lang) { ui.post(() -> startRecognition(lang)); }

        @JavascriptInterface
        public void stop() {
            ui.post(() -> { if (recognizer != null) { recognizer.cancel(); } });
        }
    }
}
