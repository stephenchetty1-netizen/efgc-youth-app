package za.org.efgc.youth;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
    private static final String HOME = "https://stephenchetty1-netizen.github.io/efgc-youth-app/?apk=90";
    private static final int PROFILE_IMAGE_REQUEST = 8801;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private TextView statusTitle;
    private TextView statusHint;
    private Button retryButton;
    private Button browserButton;
    private android.widget.ProgressBar loadingIndicator;
    private boolean pageReady;
    private WebView webView;
    private LinearLayout errorPanel;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private boolean pageFailed;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(8, 34, 70));
        getWindow().setNavigationBarColor(Color.rgb(8, 34, 70));

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 34, 70));
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(-1, -1));

        errorPanel = new LinearLayout(this);
        errorPanel.setOrientation(LinearLayout.VERTICAL);
        errorPanel.setPadding(50, 90, 50, 50);
        errorPanel.setBackgroundColor(Color.rgb(8, 34, 70));
        loadingIndicator = new android.widget.ProgressBar(this);
        loadingIndicator.setIndeterminate(true);
        errorPanel.addView(loadingIndicator);
        TextView title = new TextView(this);
        title.setText("EFGC Youth is temporarily unavailable");
        title.setTextSize(21);
        title.setTextColor(Color.WHITE);
        errorPanel.addView(title);
        statusTitle = title;
        TextView hint = new TextView(this);
        hint.setText("Please check your internet connection, then try again.");
        hint.setTextColor(Color.WHITE);
        hint.setPadding(0, 26, 0, 36);
        errorPanel.addView(hint);
        statusHint = hint;
        Button retry = new Button(this);
        retry.setText("Retry");
        retry.setOnClickListener(v -> openCurrentApp());
        errorPanel.addView(retry);
        retryButton = retry;
        Button browser = new Button(this);
        browser.setText("Open the EFGC Youth website");
        browser.setOnClickListener(v -> {
            try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(HOME))); }
            catch (ActivityNotFoundException ignored) { statusHint.setText("No browser available. Please retry."); }
        });
        errorPanel.addView(browser);
        browserButton = browser;
        errorPanel.setVisibility(View.VISIBLE);
        root.addView(errorPanel, new FrameLayout.LayoutParams(-1, -1));

        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars());
                v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                return insets;
            });
        }
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        CookieManager.getInstance().setAcceptCookie(true);
        WebView.setWebContentsDebuggingEnabled(false);

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                String host = url.getHost();
                String path = url.getPath();
                if ("https".equals(url.getScheme()) &&
                    "stephenchetty1-netizen.github.io".equals(host) &&
                    path != null && path.startsWith("/efgc-youth-app/")) return false;
                if ("about".equals(url.getScheme())) return false;
                try {
                    if ("https".equals(url.getScheme()) || "mailto".equals(url.getScheme())
                        || "tel".equals(url.getScheme()) || "market".equals(url.getScheme())) {
                        startActivity(new Intent(Intent.ACTION_VIEW, url));
                    }
                } catch (ActivityNotFoundException ignored) { }
                return true;
            }

            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                pageFailed = false;
                statusTitle.setText("Opening EFGC Youth");
                statusHint.setText("Loading your church app…");
                // A successful app session must not be covered by the retry screen
                // every time WebView receives a main-frame navigation callback.
                if (pageReady) {
                    pageReady = true;
                    errorPanel.setVisibility(View.GONE);
                    webView.setVisibility(View.VISIBLE);
                } else {
                    setLoadingState();
                }
            }

            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showLoadError("The EFGC website could not be reached. Check your connection and retry.");
            }

            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) showLoadError("The EFGC website returned HTTP " + response.getStatusCode() + ".");
            }

            @Override public void onPageFinished(WebView view, String url) {
                if (pageFailed) return;
                if (pageReady) {
                    webView.setVisibility(View.VISIBLE);
                    errorPanel.setVisibility(View.GONE);
                } else {
                    verifyVisibleWelcome(view, url, 0);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                android.webkit.ValueCallback<Uri[]> callback, FileChooserParams parameters) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                Intent selectImage = new Intent(Intent.ACTION_GET_CONTENT);
                selectImage.addCategory(Intent.CATEGORY_OPENABLE);
                selectImage.setType("image/*");
                try {
                    startActivityForResult(Intent.createChooser(selectImage, "Choose profile photo"),
                        PROFILE_IMAGE_REQUEST);
                } catch (ActivityNotFoundException e) {
                    fileCallback.onReceiveValue(null);
                    fileCallback = null;
                }
                return true;
            }
        });

        // Clear HTTP asset cache, NOT Web Storage or authenticated sessions.
        webView.clearCache(true);
        openCurrentApp();
    }

    private void verifyVisibleWelcome(WebView view, String url, int attempt) {
        handler.postDelayed(() -> {
            if (pageFailed || isFinishing() || !url.equals(view.getUrl())) return;
            // Detect a genuinely rendered welcome poster, the text fallback,
            // an opened login form, or an authenticated tab. HTML 200 alone
            // previously passed even though the member saw only navy.
            String probe = "(function(){" +
                "var w=document.getElementById('v74Welcome');" +
                "if(w&&getComputedStyle(w).display!=='none'){" +
                "var img=w.querySelector('img.v74-login-art');" +
                "var fb=document.getElementById('v89WelcomeFallback');" +
                "return !!((img&&img.complete&&img.naturalWidth>0)||(fb&&!fb.classList.contains('hidden')));}" +
                "var c=document.querySelector('#login .login-card');" +
                "if(c&&getComputedStyle(c).display!=='none'&&!c.classList.contains('mock-login-hidden'))return true;" +
                "var t=document.querySelector('main > section.tab:not(.hidden):not(#login)');" +
                "return !!(t&&getComputedStyle(t).display!=='none');" +
                "})()";
            view.evaluateJavascript(probe, result -> {
                if (pageFailed || isFinishing() || !url.equals(view.getUrl())) return;
                if ("true".equals(result)) {
                    pageReady = true;
                    errorPanel.setVisibility(View.GONE);
                    webView.setVisibility(View.VISIBLE);
                } else if (attempt < 4) {
                    verifyVisibleWelcome(view, url, attempt + 1);
                } else {
                    showLoadError("The welcome screen did not finish rendering. Retry or open the website.");
                }
            });
        }, attempt == 0 ? 250 : attempt == 1 ? 650 : attempt == 2 ? 1250 : attempt == 3 ? 2000 : 3500);
    }

    private void setLoadingState() {
        loadingIndicator.setVisibility(View.VISIBLE);
        retryButton.setVisibility(View.GONE);
        browserButton.setVisibility(View.GONE);
        errorPanel.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
    }

    private void openCurrentApp() {
        pageFailed = false;
        pageReady = false;
        statusTitle.setText("Opening EFGC Youth");
        statusHint.setText("Loading your church app…");
        setLoadingState();
        webView.loadUrl(HOME);
    }

    private void showLoadError(String detail) {
        pageFailed = true;
        pageReady = false;
        loadingIndicator.setVisibility(View.GONE);
        retryButton.setVisibility(View.VISIBLE);
        browserButton.setVisibility(View.VISIBLE);
        statusTitle.setText("EFGC Youth needs your attention");
        statusHint.setText(detail);
        webView.setVisibility(View.INVISIBLE);
        errorPanel.setVisibility(View.VISIBLE);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PROFILE_IMAGE_REQUEST || fileCallback == null) return;
        Uri[] chosen = (resultCode == RESULT_OK && data != null && data.getData() != null)
            ? new Uri[] { data.getData() } : null;
        fileCallback.onReceiveValue(chosen);
        fileCallback = null;
    }

    @Override public void onBackPressed() {
        if (pageFailed) {
            openCurrentApp();
        } else if (errorPanel.getVisibility() == View.VISIBLE) {
            // Do not restart the same page while its welcome/login is loading.
            return;
        } else if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        fileCallback = null;
        handler.removeCallbacksAndMessages(null);
        webView.destroy();
        super.onDestroy();
    }
}
