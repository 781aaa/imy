package com.example.examsystem;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;

/**
 * 最小 WebView 容器。
 *
 * 页面本身由 Vue3 构建产物通过 Express 提供，APK 只负责加载服务器地址。
 * 首次打开后点右上角「设置」，填写电脑的局域网地址（例如 http://192.168.1.10:3000）。
 */
public class MainActivity extends Activity {
    private static final String PREFS = "exam_system";
    private static final String KEY_URL = "server_url";
    private static final String DEFAULT_URL = "http://192.168.1.100:3000";

    private WebView webView;
    private SharedPreferences prefs;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        FrameLayout root = new FrameLayout(this);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        webView.setWebViewClient(new WebViewClient());

        root.addView(webView, new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT));

        Button settingsButton = new Button(this);
        settingsButton.setText("设置");
        settingsButton.setAlpha(0.75f);
        FrameLayout.LayoutParams buttonParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT,
            Gravity.TOP | Gravity.END);
        buttonParams.setMargins(0, 24, 24, 0);
        settingsButton.setLayoutParams(buttonParams);
        settingsButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                showUrlDialog();
            }
        });
        root.addView(settingsButton);

        setContentView(root);
        webView.loadUrl(prefs.getString(KEY_URL, DEFAULT_URL));
    }

    private void showUrlDialog() {
        final EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        input.setText(prefs.getString(KEY_URL, DEFAULT_URL));

        new AlertDialog.Builder(this)
            .setTitle("服务器地址")
            .setMessage("填写电脑的局域网地址，例如 http://192.168.1.10:3000")
            .setView(input)
            .setPositiveButton("打开", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    String url = input.getText().toString().trim();
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        url = "http://" + url;
                    }
                    prefs.edit().putString(KEY_URL, url).apply();
                    webView.loadUrl(url);
                }
            })
            .setNegativeButton("取消", null)
            .show();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
