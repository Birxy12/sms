import 'dart:math';
import 'package:flutter/material.dart';
import '../widgets/pinch_zoom_wrapper.dart';

class IDCardScreen extends StatefulWidget {
  const IDCardScreen({super.key});

  @override
  State<IDCardScreen> createState() => _IDCardScreenState();
}

class _IDCardScreenState extends State<IDCardScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _showFront = true;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
  }

  void _flipCard() {
    if (_showFront) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
    setState(() {
      _showFront = !_showFront;
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Digital Student ID Card'),
      ),
      body: Center(
        child: PinchZoomWrapper(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Tap Card to Flip Front / Back',
                  style: TextStyle(fontSize: 14, color: Colors.grey, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                GestureDetector(
                  onTap: _flipCard,
                  child: AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      final angle = _controller.value * pi;
                      final transform = Matrix4.identity()
                        ..setEntry(3, 2, 0.001)
                        ..rotateY(angle);

                      return Transform(
                        transform: transform,
                        alignment: Alignment.center,
                        child: angle < pi / 2
                            ? _buildCardFront()
                            : Transform(
                                transform: Matrix4.identity()..rotateY(pi),
                                alignment: Alignment.center,
                                child: _buildCardBack(),
                              ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: _flipCard,
                  icon: const Icon(Icons.flip_rounded),
                  label: const Text('Flip ID Card'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCardFront() {
    return Container(
      width: 320,
      height: 480,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF4F46E5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withOpacity(0.4),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Icon(Icons.school_rounded, color: Colors.white, size: 28),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Text(
                  'STUDENT ID',
                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          const CircleAvatar(
            radius: 46,
            backgroundColor: Colors.white24,
            child: CircleAvatar(
              radius: 42,
              backgroundColor: Colors.white,
              child: Icon(Icons.person_rounded, size: 50, color: Color(0xFF4F46E5)),
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'ALEX JOHNSON',
            style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            'REG: STU-2026-001',
            style: TextStyle(color: Colors.cyanAccent, fontSize: 13, fontWeight: FontWeight.bold),
          ),
          const Divider(color: Colors.white24, height: 24),
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _IdInfo(label: 'CLASS', value: 'JSS 3 A'),
              _IdInfo(label: 'SEX', value: 'MALE'),
              _IdInfo(label: 'SESSION', value: '2025/2026'),
            ],
          ),
          const Spacer(),
          // Barcode indicator
          Container(
            height: 36,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Center(
              child: Text(
                '║▌│█║▌│ █║▌│█│║▌║',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 3),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCardBack() {
    return Container(
      width: 320,
      height: 480,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF4F46E5), width: 2),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'TERMS & CONDITIONS',
            style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'This card remains the property of BDS International Academy. If found, please return to the school administrative office.',
            style: TextStyle(color: Colors.grey, fontSize: 11),
          ),
          const SizedBox(height: 20),
          const Text(
            'EMERGENCY CONTACT',
            style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          const Text(
            'Parent/Guardian: Mrs. Sarah Johnson\nPhone: +234 800 123 4567',
            style: TextStyle(color: Colors.white70, fontSize: 12),
          ),
          const Spacer(),
          Center(
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.qr_code_2_rounded, size: 80, color: Colors.black),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Scan to Verify Identity',
                  style: TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _IdInfo extends StatelessWidget {
  final String label;
  final String value;

  const _IdInfo({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.white54, fontSize: 10)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}
