import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../models/cbt_model.dart';

class CBTExamScreen extends StatefulWidget {
  const CBTExamScreen({super.key});

  @override
  State<CBTExamScreen> createState() => _CBTExamScreenState();
}

class _CBTExamScreenState extends State<CBTExamScreen> {
  final FirestoreService _firestoreService = FirestoreService();
  CBTExamModel? _selectedExam;

  int _currentQuestionIndex = 0;
  final Map<int, int> _selectedAnswers = {};
  int _secondsLeft = 600;
  Timer? _timer;
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadExams();
  }

  Future<void> _loadExams() async {
    setState(() => _isLoading = true);
    final auth = Provider.of<AuthService>(context, listen: false);
    final user = auth.currentUser;
    final className = user?.className ?? '';

    final exams = await _firestoreService.getCBTExams(className);
    if (mounted) {
      setState(() {
        if (exams.isNotEmpty) {
          _selectedExam = exams.first;
          _secondsLeft = _selectedExam!.durationMinutes * 60;
        }
        _isLoading = false;
      });
      if (_selectedExam != null) {
        _startTimer();
      }
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft > 0) {
        if (mounted) {
          setState(() {
            _secondsLeft--;
          });
        }
      } else {
        _timer?.cancel();
        _submitExam();
      }
    });
  }

  Future<void> _submitExam() async {
    _timer?.cancel();
    if (_selectedExam == null || _isSubmitting) return;

    setState(() => _isSubmitting = true);
    final auth = Provider.of<AuthService>(context, listen: false);
    final user = auth.currentUser;

    int score = 0;
    for (int i = 0; i < _selectedExam!.questions.length; i++) {
      final selected = _selectedAnswers[i];
      if (selected != null && selected == _selectedExam!.questions[i].correctOptionIndex) {
        score++;
      }
    }

    final regNo = user?.regNo.isNotEmpty == true ? user!.regNo : (user?.id ?? 'STU-001');
    final name = user?.name ?? 'Alex Johnson';

    await _firestoreService.submitCBTResult(
      studentRegNo: regNo,
      studentName: name,
      examTitle: _selectedExam!.title,
      score: score,
      totalQuestions: _selectedExam!.questions.length,
    );

    if (mounted) {
      setState(() => _isSubmitting = false);
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: const Text('CBT Exam Submitted! 🎉'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Your Score: $score / ${_selectedExam!.questions.length}',
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF4F46E5)),
              ),
              const SizedBox(height: 8),
              Text(
                'Percentage: ${((score / _selectedExam!.questions.length) * 100).toStringAsFixed(1)}%',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 12),
              const Text('Result synced with school server database.', style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
          actions: [
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pop(context);
              },
              child: const Text('Return to Dashboard'),
            ),
          ],
        ),
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('CBT Examination')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_selectedExam == null || _selectedExam!.questions.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: const Text('CBT Examination')),
        body: const Center(child: Text('No questions available for this exam.')),
      );
    }

    final questions = _selectedExam!.questions;
    final currentQ = questions[_currentQuestionIndex];
    final minutes = (_secondsLeft / 60).floor();
    final seconds = _secondsLeft % 60;
    final formattedTime = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Scaffold(
      appBar: AppBar(
        title: Text(_selectedExam!.title),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _secondsLeft < 120 ? Colors.red.withValues(alpha: 0.2) : const Color(0xFF4F46E5).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.timer_rounded,
                  size: 18,
                  color: _secondsLeft < 120 ? Colors.red : const Color(0xFF4F46E5),
                ),
                const SizedBox(width: 6),
                Text(
                  formattedTime,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _secondsLeft < 120 ? Colors.red : const Color(0xFF4F46E5),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Question Progress Bar
            LinearProgressIndicator(
              value: (_currentQuestionIndex + 1) / questions.length,
              backgroundColor: Colors.grey[300],
              color: const Color(0xFF4F46E5),
              borderRadius: BorderRadius.circular(10),
            ),
            const SizedBox(height: 16),
            Text(
              'Question ${_currentQuestionIndex + 1} of ${questions.length}',
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 16),

            // Question Text Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Text(
                  currentQ.questionText,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Options List
            Expanded(
              child: ListView.builder(
                itemCount: currentQ.options.length,
                itemBuilder: (context, idx) {
                  final optionText = currentQ.options[idx];
                  final isSelected = _selectedAnswers[_currentQuestionIndex] == idx;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedAnswers[_currentQuestionIndex] = idx;
                      });
                    },
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFF4F46E5).withValues(alpha: 0.12) : Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF4F46E5) : Colors.grey.withValues(alpha: 0.3),
                          width: isSelected ? 2.0 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 14,
                            backgroundColor: isSelected ? const Color(0xFF4F46E5) : Colors.grey[300],
                            child: Text(
                              String.fromCharCode(65 + idx),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: isSelected ? Colors.white : Colors.black87,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Text(
                              optionText,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Navigation Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_currentQuestionIndex > 0)
                  OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _currentQuestionIndex--;
                      });
                    },
                    child: const Text('Previous'),
                  )
                else
                  const SizedBox(),
                if (_currentQuestionIndex < questions.length - 1)
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {
                      setState(() {
                        _currentQuestionIndex++;
                      });
                    },
                    child: const Text('Next Question'),
                  )
                else
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: _isSubmitting ? null : _submitExam,
                    child: _isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Submit Exam'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
