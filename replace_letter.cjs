const fs = require('fs');

let pubContent = fs.readFileSync('src/pages/public/AdmissionPortal.jsx', 'utf-8');

let startIdx = pubContent.indexOf('<div\n                    ref={letterRef}\n                    id="admission-letter"');
let endIdx = pubContent.indexOf('{/* Payment Action Bar */}');

if (startIdx === -1 || endIdx === -1) {
    console.error("Could not find letter in AdmissionPortal.jsx");
    process.exit(1);
}

// Backtrack to the closing div of the letter.
let letterMarkup = pubContent.substring(startIdx, endIdx);
let lastDivIdx = letterMarkup.lastIndexOf('</div>');
letterMarkup = letterMarkup.substring(0, lastDivIdx + 6); // include </div>

letterMarkup = letterMarkup.replace(/appData\?\.applicant\?\.fullName/g, 'adm.studentName || adm.fullName || adm.applicantName');
letterMarkup = letterMarkup.replace(/appData\?\.applicant\?\.classApplyingFor/g, 'adm.classApplyingFor || adm.targetClass');
letterMarkup = letterMarkup.replace(/appData\?\.appNo/g, 'adm.appNo || adm.applicationNumber || adm.id');
letterMarkup = letterMarkup.replace(/result\.regNo/g, 'adm.regNo');
letterMarkup = letterMarkup.replace(/result\.status === 'granted'/g, "adm.status?.toLowerCase() === 'admitted'");
letterMarkup = letterMarkup.replace(/result\.percentage/g, '(adm.cbtScore || adm.percentage || 0)');
letterMarkup = letterMarkup.replace(/result\.score/g, '(adm.cbtScore || 0)');
letterMarkup = letterMarkup.replace(/result\.total/g, '(adm.cbtTotal || 100)');
letterMarkup = letterMarkup.replace('id="admission-letter"', 'id={`letter-${adm.id}`}');
letterMarkup = letterMarkup.replace('ref={letterRef}\n                    ', '');
letterMarkup = letterMarkup.replace('className="admission-letter-card"', '');
letterMarkup = letterMarkup.replace("margin: '0 auto'", "display: 'none'");
letterMarkup = letterMarkup.replace(/result\.status !== 'granted'/g, "adm.status?.toLowerCase() !== 'admitted'");
letterMarkup = letterMarkup.replace(/result\.status/g, "adm.status");
// fix bookpack reference
letterMarkup = letterMarkup.replace('getBookPackForClass(letterTargetClass)', 'getBookPackForClass(letterTargetClass, exerciseBookPacks)');
letterMarkup = letterMarkup.replace('getBookPackForClass(letterTargetClass)', 'getBookPackForClass(letterTargetClass, exerciseBookPacks)');
letterMarkup = letterMarkup.replace('getBookPackForClass(letterTargetClass)', 'getBookPackForClass(letterTargetClass, exerciseBookPacks)');


let adminContent = fs.readFileSync('src/components/AdminAdmissionPortal.jsx', 'utf-8');
let adminStart = adminContent.indexOf('<div id={`letter-${adm.id}`}')
let adminEnd = adminContent.indexOf('</div>\n                          </div>\n                        </div>\n                      </div>\n                    </div>\n                  </td>\n                </tr>', adminStart)

if (adminStart !== -1 && adminEnd !== -1) {
    let before = adminContent.substring(0, adminStart);
    // Find the proper end of the letter div by counting opening and closing divs
    let currentHtml = adminContent.substring(adminStart);
    let divCount = 0;
    let endIdx = 0;
    let i = 0;
    while(i < currentHtml.length) {
        if (currentHtml.substr(i, 4) === '<div') {
            divCount++;
        } else if (currentHtml.substr(i, 5) === '</div') {
            divCount--;
            if (divCount === 0) {
                endIdx = i + 6;
                break;
            }
        }
        i++;
    }
    
    let after = currentHtml.substring(endIdx);
    fs.writeFileSync('src/components/AdminAdmissionPortal.jsx', before + letterMarkup + after);
    console.log("Successfully replaced letter markup in AdminAdmissionPortal.jsx");
} else {
    console.error("Could not find letter in AdminAdmissionPortal.jsx");
}
