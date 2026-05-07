# Git Push Automation Script
git add .
$commitMsg = "Fix: Update RLS policies for marks table and general improvements"
git commit -m $commitMsg
git push
Write-Host "Changes pushed to git successfully!" -ForegroundColor Green
