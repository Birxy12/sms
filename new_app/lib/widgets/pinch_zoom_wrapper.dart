import 'package:flutter/material.dart';

class PinchZoomWrapper extends StatefulWidget {
  final Widget child;
  final double minScale;
  final double maxScale;

  const PinchZoomWrapper({
    super.key,
    required this.child,
    this.minScale = 1.0,
    this.maxScale = 4.0,
  });

  @override
  State<PinchZoomWrapper> createState() => _PinchZoomWrapperState();
}

class _PinchZoomWrapperState extends State<PinchZoomWrapper> {
  final TransformationController _controller = TransformationController();
  TapDownDetails? _doubleTapDetails;

  void _handleDoubleTap() {
    if (_controller.value != Matrix4.identity()) {
      _controller.value = Matrix4.identity();
    } else if (_doubleTapDetails != null) {
      final position = _doubleTapDetails!.localPosition;
      final x = -position.dx * 1.5;
      final y = -position.dy * 1.5;
      _controller.value = Matrix4.translationValues(x, y, 0.0)..scaleByDouble(2.5, 2.5, 1.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        GestureDetector(
          onDoubleTapDown: (details) => _doubleTapDetails = details,
          onDoubleTap: _handleDoubleTap,
          child: InteractiveViewer(
            transformationController: _controller,
            minScale: widget.minScale,
            maxScale: widget.maxScale,
            panEnabled: true,
            scaleEnabled: true,
            child: widget.child,
          ),
        ),
        Positioned(
          top: 12,
          right: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.65),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
                SizedBox(width: 4),
                Text(
                  'Pinch to Zoom',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
