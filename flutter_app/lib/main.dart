import 'dart:async';
import 'dart:io';
import 'dart:io' show Platform;

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:local_notifier/local_notifier.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_windows/webview_windows.dart';

const String currentAppVersion = "2.0.0";

const _appUrl = 'https://bdsportals.vercel.app';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (Platform.isWindows) {
    await localNotifier.setup(appName: 'SMS Portal', shortcutPolicy: ShortcutPolicy.requireCreate);
  }
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'School Management System',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4F46E5),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const AppShell(),
    );
  }
}

// ─── App Shell: handles connectivity & routes to correct WebView ────────────

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      if (mounted && online != _isOnline) {
        setState(() => _isOnline = online);
      }
    });
    
    // Check for updates if online and on Windows
    if (Platform.isWindows) {
      Future.delayed(const Duration(seconds: 5), () {
        if (_isOnline) {
          _checkForUpdates();
        }
      });
    }
  }

  Future<void> _checkForUpdates() async {
    try {
      final response = await http.get(Uri.parse('$_appUrl/windows-version.json'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final latestVersion = data['version'] as String;
        final downloadUrl = data['downloadUrl'] as String;
        
        if (_isNewerVersion(currentAppVersion, latestVersion)) {
          _showUpdateNotification(downloadUrl, latestVersion);
        }
      }
    } catch (e) {
      debugPrint("Update check failed: $e");
    }
  }

  bool _isNewerVersion(String current, String latest) {
    final v1 = current.split('.').map(int.parse).toList();
    final v2 = latest.split('.').map(int.parse).toList();
    for (var i = 0; i < 3; i++) {
      if (v2[i] > v1[i]) return true;
      if (v2[i] < v1[i]) return false;
    }
    return false;
  }

  void _showUpdateNotification(String downloadUrl, String latestVersion) {
    final notification = LocalNotification(
      title: "Update Available",
      body: "Version $latestVersion is available. Click here to update the app.",
    );
    notification.onClick = () async {
      final tempDir = await getTemporaryDirectory();
      final savePath = '${tempDir.path}\\SMSPortal-Setup-$latestVersion.exe';
      
      // Notify downloading
      final downloadNotif = LocalNotification(title: "Downloading Update", body: "Please wait...");
      downloadNotif.show();
      
      try {
        final req = await http.get(Uri.parse(downloadUrl));
        final file = File(savePath);
        await file.writeAsBytes(req.bodyBytes);
        
        // Execute installer silently and close current app
        Process.start(savePath, ['/SILENT', '/SUPPRESSMSGBOXES']);
        exit(0);
      } catch (e) {
        debugPrint("Download failed: $e");
      }
    };
    notification.show();
  }

  Future<void> _checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    final online = results.any((r) => r != ConnectivityResult.none);
    if (mounted) setState(() => _isOnline = online);
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (Platform.isWindows) {
      return WindowsWebView(isOnline: _isOnline);
    }
    return MobileWebView(isOnline: _isOnline);
  }
}

// ─── Windows WebView ────────────────────────────────────────────────────────

class WindowsWebView extends StatefulWidget {
  final bool isOnline;
  const WindowsWebView({super.key, required this.isOnline});

  @override
  State<WindowsWebView> createState() => _WindowsWebViewState();
}

class _WindowsWebViewState extends State<WindowsWebView> {
  final _controller = WebviewController();
  _ViewState _state = _ViewState.loading;
  String? _error;
  bool _wasOnline = true;

  @override
  void initState() {
    super.initState();
    _init();
  }

  @override
  void didUpdateWidget(WindowsWebView old) {
    super.didUpdateWidget(old);
    // Came back online → reload
    if (!_wasOnline && widget.isOnline && _state == _ViewState.ready) {
      _controller.loadUrl(_appUrl);
    }
    _wasOnline = widget.isOnline;
  }

  Future<void> _init() async {
    try {
      final available = await WebviewController.getWebViewVersion();
      if (available == null) {
        setState(() {
          _state = _ViewState.webview2Missing;
        });
        return;
      }

      await _controller.initialize();

      // Enable dev tools in debug, disable in release
      await _controller.setBackgroundColor(Colors.white);
      await _controller.setPopupWindowPolicy(WebviewPopupWindowPolicy.deny);

      _controller.url.listen((url) {/* track navigation if needed */});
      _controller.loadingState.listen((state) {
        if (state == LoadingState.navigationCompleted && mounted) {
          if (_state != _ViewState.ready) {
            setState(() => _state = _ViewState.ready);
          }
        }
      });

      if (widget.isOnline) {
        await _controller.loadUrl(_appUrl);
      } else {
        // Load offline CBT page from cache via service worker
        await _controller.loadUrl('$_appUrl/cbt');
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _state = _ViewState.error;
          _error = e.toString();
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // WebView (always present once initialized)
          if (_state == _ViewState.ready || _state == _ViewState.loading)
            Webview(_controller, permissionRequested: _onPermissionRequested),

          // Loading overlay
          if (_state == _ViewState.loading) _buildLoading(),

          // Error states
          if (_state == _ViewState.webview2Missing) _buildWebView2Missing(),
          if (_state == _ViewState.error) _buildError(),

          // Offline banner
          if (!widget.isOnline && _state == _ViewState.ready) _buildOfflineBanner(),
        ],
      ),
    );
  }

  Future<WebviewPermissionDecision> _onPermissionRequested(
      String url, WebviewPermissionKind kind, bool isUserInitiated) async {
    return WebviewPermissionDecision.allow;
  }

  Widget _buildLoading() {
    return Container(
      color: Colors.white,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Image.asset('assets/logo.png', width: 80, height: 80,
                errorBuilder: (_, __, ___) => const Icon(Icons.school, size: 80, color: Color(0xFF4F46E5))),
            const SizedBox(height: 24),
            const Text('Loading SMS Portal...', style: TextStyle(fontSize: 16, color: Color(0xFF6B7280))),
            const SizedBox(height: 16),
            const SizedBox(width: 200, child: LinearProgressIndicator(color: Color(0xFF4F46E5))),
          ],
        ),
      ),
    );
  }

  Widget _buildWebView2Missing() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.warning_amber_rounded, size: 72, color: Color(0xFFF59E0B)),
            const SizedBox(height: 24),
            const Text('Microsoft WebView2 Runtime Required',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center),
            const SizedBox(height: 12),
            const Text(
              'This app needs the Microsoft WebView2 Runtime to display web content.\n'
              'It\'s free and installs in seconds.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: Color(0xFF6B7280)),
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              icon: const Icon(Icons.download),
              label: const Text('Download WebView2 Runtime'),
              onPressed: () => launchUrl(Uri.parse(
                  'https://developer.microsoft.com/en-us/microsoft-edge/webview2/')),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () {
                setState(() => _state = _ViewState.loading);
                _init();
              },
              child: const Text('Retry after installing'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildError() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 72, color: Color(0xFFEF4444)),
            const SizedBox(height: 24),
            const Text('Something went wrong', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text(_error ?? 'Unknown error',
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 13, color: Color(0xFF9CA3AF))),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4F46E5),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              ),
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              onPressed: () {
                setState(() { _state = _ViewState.loading; _error = null; });
                _init();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOfflineBanner() {
    return Positioned(
      top: 0, left: 0, right: 0,
      child: Material(
        color: const Color(0xFFF59E0B),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          child: Row(
            children: const [
              Icon(Icons.wifi_off, color: Colors.white, size: 18),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'You are offline — only CBT mode is available',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

enum _ViewState { loading, ready, webview2Missing, error }

// ─── Mobile WebView (Android / iOS) ─────────────────────────────────────────

class MobileWebView extends StatefulWidget {
  final bool isOnline;
  const MobileWebView({super.key, required this.isOnline});

  @override
  State<MobileWebView> createState() => _MobileWebViewState();
}

class _MobileWebViewState extends State<MobileWebView> with SingleTickerProviderStateMixin {
  late final WebViewController _controller;
  bool _loading = true;
  int _progress = 0;
  bool _wasOnline = true;
  late final AnimationController _animController;
  late final Animation<double> _bounceAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    )..repeat(reverse: true);
    
    _bounceAnim = Tween<double>(begin: 0, end: -30).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(NavigationDelegate(
        onPageStarted: (_) { if (mounted) setState(() { _loading = true; _progress = 0; }); },
        onProgress: (progress) { if (mounted) setState(() => _progress = progress); },
        onPageFinished: (_) { if (mounted) setState(() => _loading = false); },
        onWebResourceError: (err) {
          if (mounted) setState(() => _loading = false);
        },
        onNavigationRequest: (req) => NavigationDecision.navigate,
      ))
      ..loadRequest(Uri.parse(widget.isOnline ? _appUrl : '$_appUrl/cbt'));
  }

  @override
  void didUpdateWidget(MobileWebView old) {
    super.didUpdateWidget(old);
    if (!_wasOnline && widget.isOnline) {
      _controller.loadRequest(Uri.parse(_appUrl));
    }
    _wasOnline = widget.isOnline;
  }
  
  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loading)
              Container(
                color: Colors.white,
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedBuilder(
                        animation: _bounceAnim,
                        builder: (context, child) {
                          return Transform.translate(
                            offset: Offset(0, _bounceAnim.value),
                            child: child,
                          );
                        },
                        child: Image.asset(
                          'assets/logo.png',
                          width: 100,
                          height: 100,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.school, size: 100, color: Color(0xFF4F46E5)
                          ),
                        ),
                      ),
                      const SizedBox(height: 40),
                      SizedBox(
                        width: 200,
                        child: LinearProgressIndicator(
                          value: _progress / 100.0,
                          color: const Color(0xFF4F46E5),
                          backgroundColor: const Color(0xFFE5E7EB),
                          minHeight: 8,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        '$_progress%',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF4F46E5),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (!widget.isOnline)
              Positioned(
                top: 0, left: 0, right: 0,
                child: Material(
                  color: const Color(0xFFF59E0B),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    child: Row(
                      children: const [
                        Icon(Icons.wifi_off, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'You are offline — only CBT mode is available',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
