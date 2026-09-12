const admin = require('firebase-admin');

// Initialize with default credentials
admin.initializeApp({
  projectId: 'schoolpoetal' // The user's project ID based on previous logs
});

const db = admin.firestore();

async function fixAdmissions() {
  try {
    const snapshot = await db.collection('admissions').get();
    let updated = 0;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Check if they completed CBT and we have a percentage
      if (data.cbtCompleted && typeof data.cbtPercentage === 'number') {
        const correctStatus = data.cbtPercentage >= 40 ? 'Admitted' : 'Not Admitted';
        
        // If the current status is not the correct one, update it
        if (data.status !== correctStatus) {
          await doc.ref.update({
            status: correctStatus,
            admissionStatus: data.cbtPercentage >= 40 ? 'granted' : 'rejected'
          });
          updated++;
          console.log(`Updated ${doc.id} (${data.applicantName || data.studentName || 'Unknown'}) to ${correctStatus}`);
        }
      }
    }
    console.log(`Successfully updated ${updated} admission records.`);
  } catch (err) {
    console.error('Error updating records:', err);
  }
}

fixAdmissions();
