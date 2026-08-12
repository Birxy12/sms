import 'dart:async';
import 'package:flutter/material.dart';

class CBTExamScreen extends StatefulWidget {
  const CBTExamScreen({super.key});

  @override
  State<CBTExamScreen> createState() => _CBTExamScreenState();
}

class _CBTExamScreenState extends State<CBTExamScreen> {
  int _currentQuestionIndex = 0;
  final Map<int, int> _selectedAnswers = {};
  int _secondsLeft = 600; // 10 minutes
  Timer? _timer;

  final List<Map<String, dynamic>> _questions = const [
    {
      'question': 'Which organelle is known as the powerhouse of the cell?',
      'options': ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Apparatus'],
      'answer': 1,
    },
    {
      'question': 'What is the chemical symbol for Gold?',
      'options': ['Ag', 'Au', 'Fe', 'Cu'],
      'answer': 1,
    },
    {
      'question': 'Solve for x: 3x + 12 = 36',
      'options': ['x = 6', 'x = 8', 'x = 10', 'x = 12'],
      'answer': 1,
    },
    {
      'question': 'Which of the following is a primary input device?',
      'options': ['Printer', 'Keyboard', 'Monitor', 'Speaker'],
      'answer': 1,
    },
    {
      'question': 'What is the capital city of Nigeria?',
      'options': ['Lagos', 'Abuja', 'Kano', 'Ibadan'],
      'answer': 1,
    },
  ];

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsLeft > 0) {
        setState(() {
          _secondsLeft--;
        });
      } else {
        _timer?.cancel();
        _submitExam();
      }
    });
  }

  void _submitExam() {
    _timer?.cancel();
    int score = 0;
    _selectedAnswers.forEach((index, selected) {
      if (selected == _questions[index]['answer']) {
        score++;
      }
    });

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
              'Your Score: $score / ${_questions.length}',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF4F46E5)),
            ),
            const SizedBox(height: 8),
            Text(
              'Percentage: ${(score / _questions.length * 100).toStringAsFixed(1)}%',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
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

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentQ = _questions[_currentQuestionIndex];
    final minutes = (_secondsLeft / 60).floor();
    final seconds = _secondsLeft % 60;
    final formattedTime = '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('CBT Examination'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _secondsLeft < 120 ? Colors.red.withOpacity(0.2) : const Color(0xFF4F46E5).withOpacity(0.15),
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
            // Question Progress
            LinearProgressIndicator(
              value: (_currentQuestionIndex + 1) / _questions.length,
              backgroundColor: Colors.grey[300],
              color: const Color(0xFF4F46E5),
              borderRadius: BorderRadius.circular(10),
            ),
            const SizedBox(height: 16),
            Text(
              'Question ${_currentQuestionIndex + 1} of ${_questions.length}',
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
                  currentQ['question'],
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Options List
            Expanded(
              child: ListView.builder(
                itemCount: (currentQ['options'] as List).length,
                itemBuilder: (context, idx) {
                  final optionText = currentQ['options'][idx];
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
                        color: isSelected ? const Color(0xFF4F46E5).withOpacity(0.12) : Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF4F46E5) : Colors.grey.withOpacity(0.3),
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
                if (_currentQuestionIndex < _questions.length - 1)
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
                    onPressed: _submitExam,
                    child: const Text('Submit Exam'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
