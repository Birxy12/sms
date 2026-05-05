/**
 * questionGenerator.js
 * A utility to generate academic questions for various subjects and classes.
 */

const QUESTION_BANK = {
  'MATHEMATICS': [
    { prompt: "What is the square root of 144?", options: ["10", "12", "14", "16"], correctIndex: 1 },
    { prompt: "Solve for x: 2x + 5 = 15", options: ["5", "10", "2", "7"], correctIndex: 0 },
    { prompt: "What is the value of Pi (to 2 decimal places)?", options: ["3.12", "3.16", "3.14", "3.18"], correctIndex: 2 },
    { prompt: "How many sides does a hexagon have?", options: ["5", "6", "7", "8"], correctIndex: 1 },
    { prompt: "What is 15% of 200?", options: ["20", "25", "30", "35"], correctIndex: 2 },
    { prompt: "The sum of angles in a triangle is?", options: ["90°", "180°", "270°", "360°"], correctIndex: 1 },
    { prompt: "What is the product of 9 and 7?", options: ["56", "63", "72", "81"], correctIndex: 1 },
    { prompt: "Convert 1/4 to percentage.", options: ["20%", "25%", "30%", "40%"], correctIndex: 1 },
    { prompt: "What is the next prime number after 7?", options: ["9", "10", "11", "13"], correctIndex: 2 },
    { prompt: "Area of a rectangle with length 10cm and width 5cm is?", options: ["15cm²", "30cm²", "50cm²", "100cm²"], correctIndex: 2 },
    // Adding more to reach 30 if needed, but for now I'll generate by duplicating with slight variations or unique ones
    { prompt: "What is 2 to the power of 5?", options: ["16", "24", "32", "64"], correctIndex: 2 },
    { prompt: "Simplify: 10 - 2 * 3", options: ["24", "8", "4", "12"], correctIndex: 2 },
    { prompt: "Which of these is a composite number?", options: ["2", "3", "4", "5"], correctIndex: 2 },
    { prompt: "A right angle is exactly?", options: ["45°", "90°", "180°", "360°"], correctIndex: 1 },
    { prompt: "How many degrees are in a circle?", options: ["180°", "270°", "360°", "400°"], correctIndex: 2 },
  ],
  'ENGLISH LANGUAGE': [
    { prompt: "Choose the correct synonym for 'Happy'", options: ["Sad", "Joyful", "Angry", "Tired"], correctIndex: 1 },
    { prompt: "Identify the noun in: 'The boy runs fast'", options: ["Boy", "Runs", "Fast", "The"], correctIndex: 0 },
    { prompt: "What is the plural of 'Child'?", options: ["Childs", "Children", "Childrens", "Childes"], correctIndex: 1 },
    { prompt: "Which word is an adjective?", options: ["Run", "Blue", "Quickly", "Book"], correctIndex: 1 },
    { prompt: "Opposite of 'Ancient' is?", options: ["Old", "Modern", "Classic", "Antique"], correctIndex: 1 },
    { prompt: "Complete: 'She ___ to school every day'", options: ["go", "goes", "going", "gone"], correctIndex: 1 },
    { prompt: "What is a person who writes books called?", options: ["Actor", "Author", "Artist", "Architect"], correctIndex: 1 },
    { prompt: "Identify the verb: 'Birds fly in the sky'", options: ["Birds", "Fly", "Sky", "In"], correctIndex: 1 },
    { prompt: "Which is a conjunction?", options: ["And", "Quick", "He", "Running"], correctIndex: 0 },
    { prompt: "Meaning of 'Obstacle'?", options: ["Help", "Barrier", "Path", "Door"], correctIndex: 1 },
  ],
  'BASIC SCIENCE': [
    { prompt: "Which planet is known as the Red Planet?", options: ["Venus", "Mars", "Jupiter", "Saturn"], correctIndex: 1 },
    { prompt: "What gas do humans breathe out?", options: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], correctIndex: 1 },
    { prompt: "What is the boiling point of water?", options: ["90°C", "100°C", "110°C", "120°C"], correctIndex: 1 },
    { prompt: "Which part of the plant conducts photosynthesis?", options: ["Root", "Stem", "Leaf", "Flower"], correctIndex: 2 },
    { prompt: "Human body has how many bones (adult)?", options: ["106", "206", "306", "406"], correctIndex: 1 },
    { prompt: "Force that pulls objects toward Earth is?", options: ["Magnetism", "Friction", "Gravity", "Elasticity"], correctIndex: 2 },
    { prompt: "Unit of electric current is?", options: ["Volt", "Watt", "Ampere", "Ohm"], correctIndex: 2 },
    { prompt: "Which is a state of matter?", options: ["Sound", "Light", "Solid", "Heat"], correctIndex: 2 },
    { prompt: "The center of an atom is called?", options: ["Proton", "Electron", "Nucleus", "Neutron"], correctIndex: 2 },
    { prompt: "Speed of light is approximately?", options: ["300,000 km/s", "150,000 km/s", "500,000 km/s", "1,000,000 km/s"], correctIndex: 0 },
  ]
};

export const generateQuestions = (subject, count = 30) => {
  const baseQuestions = QUESTION_BANK[subject] || QUESTION_BANK['MATHEMATICS'];
  const results = [];
  
  for (let i = 0; i < count; i++) {
    const template = baseQuestions[i % baseQuestions.length];
    // Create a copy and maybe slightly modify (e.g. change numbers if it's math)
    let finalPrompt = template.prompt;
    let finalOptions = [...template.options];
    
    if (subject === 'MATHEMATICS' && i >= baseQuestions.length) {
      // Very simple procedural variation for math
      const multiplier = Math.floor(i / baseQuestions.length) + 1;
      if (template.prompt.includes('square root of 144')) {
         finalPrompt = `What is the square root of ${144 * multiplier * multiplier}?`;
         finalOptions = [String(10 * multiplier), String(12 * multiplier), String(14 * multiplier), String(16 * multiplier)];
      }
    }
    
    results.push({
      ...template,
      prompt: i >= baseQuestions.length ? `${finalPrompt} (Set ${Math.floor(i/baseQuestions.length) + 1})` : finalPrompt,
      options: finalOptions
    });
  }
  
  return results;
};
