const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const doc = new Document({
  creator: "GlobixTech",
  title: "School Management System Proposal",
  description: "Proposal for an affordable School Management System",
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "PROPOSAL FOR A COMPREHENSIVE SCHOOL MANAGEMENT SYSTEM",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Prepared by: ", bold: true }),
            new TextRun("GlobixTech"),
          ],
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Email: ", bold: true }),
            new TextRun({ text: "GLOBIXTECH@GMAIL.COM", color: "0000FF", underline: {} }),
          ],
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: "1. Executive Summary",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "In today’s fast-paced educational environment, managing school operations manually or with disjointed tools can lead to inefficiencies, errors, and increased costs. GlobixTech offers a robust, cloud-based School Management System (SMS) tailored to streamline administrative tasks, enhance communication, and improve the overall learning experience—all at an affordable price.",
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "2. Key Features & Modules",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({ text: "• Admission & Enrollment Portal: Seamlessly manage new applications, automate application numbers, and generate admission slips.", bullet: { level: 0 } }),
        new Paragraph({ text: "• Computer-Based Testing (CBT): Integrated testing engine for automated grading, immediate result generation, and secure examinations.", bullet: { level: 0 } }),
        new Paragraph({ text: "• Finance & Fee Tracking: Track school fees, generate receipts, and manage debtors effortlessly. Integrated with modern payment gateways.", bullet: { level: 0 } }),
        new Paragraph({ text: "• Academic Records & Result Printing: Automatically calculate grades, class averages, and positions. Supports bulk PDF result generation.", bullet: { level: 0 } }),
        new Paragraph({ text: "• Staff & Student Dashboards: Dedicated secure portals for teachers to upload scores and for students to view their performance.", bullet: { level: 0 } }),
        new Paragraph({ text: "• Automated Attendance: Keep track of student presence effectively, ready for biometric integration.", bullet: { level: 0 } }),
        new Paragraph({
          text: "3. Why Choose GlobixTech's Solution?",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 100 },
        }),
        new Paragraph({
          text: "Unlike traditional Enterprise ERPs that cost a fortune and are complicated to use, our solution is built specifically for modern schools looking for simplicity, speed, and cost-effectiveness. We offer free setup and onboarding, and our pricing is flexible based on student population, ensuring you never pay more than you should.",
          spacing: { after: 200 },
        }),
        new Paragraph({
          text: "4. Pricing & Implementation",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: "We provide highly competitive and affordable pricing plans starting with minimal setup fees and low-cost termly/yearly maintenance. Implementation takes less than a week, including data migration and staff training.",
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: "We would love to schedule a brief demonstration to show you how our system can transform your school's daily operations. Please reach out to us at GLOBIXTECH@GMAIL.COM to proceed.",
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("C:\\Users\\globi\\Desktop\\School_Management_System_Proposal.docx", buffer);
  console.log("Document created successfully at C:\\Users\\globi\\Desktop\\School_Management_System_Proposal.docx");
});
