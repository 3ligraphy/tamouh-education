import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

export async function generateCertificatePDF({
  userName,
  courseName,
  completedDate,
  instructorName,
  certificateCode,
  existingFileName = null, // Optional parameter for existing filename
}) {
  try {
    // For server-side, we'll generate an HTML template and convert to PDF
    // or use a simpler approach with HTML that can be printed as PDF
    
    // Create certificates directory if it doesn't exist
    const certificatesDir = path.join(process.cwd(), 'public', 'certificates');
    if (!existsSync(certificatesDir)) {
      mkdirSync(certificatesDir, { recursive: true });
    }

    // Use existing filename or generate a new one
    const fileName = existingFileName || `certificate-${certificateCode}.html`;
    const filePath = path.join(certificatesDir, fileName);
    
    // Format the completion date
    const formattedDate = new Date(completedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Generate HTML certificate template
    const certificateHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Certificate of Completion - ${courseName}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 0;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            width: 297mm;
            height: 210mm;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
            padding: 20mm;
        }
        
        .certificate {
            width: 100%;
            height: 100%;
            background: white;
            border: 8px solid #3b82f6;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 40px;
        }
        
        .certificate::before {
            content: '';
            position: absolute;
            top: 15px;
            left: 15px;
            right: 15px;
            bottom: 15px;
            border: 2px solid #dbeafe;
            border-radius: 12px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 20px;
            letter-spacing: 2px;
        }
        
        .title {
            font-size: 48px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 30px;
            letter-spacing: 3px;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        
        .subtitle {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 25px;
        }
        
        .name {
            font-size: 36px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 25px;
            text-decoration: underline;
            text-decoration-color: #3b82f6;
            text-underline-offset: 8px;
        }
        
        .completion-text {
            font-size: 18px;
            color: #64748b;
            margin-bottom: 20px;
        }
        
        .course-name {
            font-size: 28px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 30px;
            font-style: italic;
        }
        
        .date {
            font-size: 16px;
            color: #64748b;
            margin-bottom: 40px;
        }
        
        .footer {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-top: auto;
            padding-top: 30px;
        }
        
        .signature-section {
            text-align: left;
        }
        
        .code-section {
            text-align: right;
        }
        
        .footer-label {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 5px;
        }
        
        .footer-value {
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
        }
        
        .signature-line {
            width: 150px;
            height: 1px;
            background-color: #9ca3af;
            margin-top: 5px;
        }
        
        .decorative-element {
            position: absolute;
            top: 30px;
            right: 30px;
            width: 60px;
            height: 60px;
            background: linear-gradient(45deg, #3b82f6, #1d4ed8);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
        }
        
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="decorative-element">🏆</div>
        
        <div class="logo">TAMOUH EDUCATION</div>
        
        <div class="title">CERTIFICATE OF COMPLETION</div>
        
        <div class="subtitle">This is to certify that</div>
        
        <div class="name">${userName}</div>
        
        <div class="completion-text">has successfully completed the course</div>
        
        <div class="course-name">"${courseName}"</div>
        
        <div class="date">Completed on: ${formattedDate}</div>
        
        <div class="footer">
            <div class="signature-section">
                <div class="footer-label">Instructor:</div>
                <div class="footer-value">${instructorName}</div>
                <div class="signature-line"></div>
            </div>
            
            <div class="code-section">
                <div class="footer-label">Certificate Code:</div>
                <div class="footer-value">${certificateCode}</div>
            </div>
        </div>
    </div>
</body>
</html>`;

    // Write the HTML file
    writeFileSync(filePath, certificateHtml, 'utf8');
    
    // Verify the file was created
    if (!existsSync(filePath)) {
      throw new Error('Certificate file was not created successfully');
    }
    
    // Return the public URL
    const certificateUrl = `/certificates/${fileName}`;
    
    console.log('Certificate generated successfully:', {
      fileName,
      filePath,
      certificateUrl,
      userName,
      courseName,
      certificateCode
    });
    
    return certificateUrl;
    
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw new Error('Failed to generate certificate');
  }
}

// PDF generation version using puppeteer (optional, for future use)
export async function generateCertificatePDFWithPuppeteer({
  userName,
  courseName,
  completedDate,
  instructorName,
  certificateCode,
}) {
  try {
    // This would require puppeteer to be installed
    // For now, we'll use the HTML version which can be printed as PDF
    return generateCertificatePDF({
      userName,
      courseName,
      completedDate,
      instructorName,
      certificateCode,
    });
  } catch (error) {
    console.error('Error generating PDF certificate:', error);
    throw new Error('Failed to generate PDF certificate');
  }
} 