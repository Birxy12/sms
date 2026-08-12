import 'dart:async';
import 'package:app_links/app_links.dart';
import 'package:flutter/material.dart';

class DeepLinkService {
  final _appLinks = AppLinks();
  StreamSubscription<Uri>? _sub;

  void initDeepLinks(Function(String path) onPathReceived) {
    // Handle initial link if app was launched via intent URL
    _appLinks.getInitialLink().then((uri) {
      if (uri != null) {
        onPathReceived(_parsePath(uri));
      }
    });

    // Handle ongoing link intents while app is running
    _sub = _appLinks.uriLinkStream.listen((uri) {
      onPathReceived(_parsePath(uri));
    }, onError: (err) {
      debugPrint('Deep Link Error: $err');
    });
  }

  String _parsePath(Uri uri) {
    if (uri.scheme == 'bdsportal') {
      return uri.host.isNotEmpty ? '/${uri.host}' : uri.path;
    }
    return uri.path.isNotEmpty ? uri.path : '/';
  }

  void dispose() {
    _sub?.cancel();
  }
}
