; =====================================================
; SMS Portal - Windows Installer Script (Inno Setup 6)
; =====================================================

#define AppName "SMS Portal"
#define AppVersion "2.0.0"
#define AppPublisher "GlobixTech"
#define AppURL "https://bdsportals.vercel.app"
#define AppExeName "sms_app.exe"
#define AppSupportURL "https://bdsportals.vercel.app/contact"
#define SourceDir "flutter_app\build\windows\x64\runner\Release"

[Setup]
AppId={{B7A2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppSupportURL}
AppUpdatesURL={#AppURL}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
OutputDir={userdesktop}\SMSPortal-Installer
OutputBaseFilename=SMSPortal-Setup-v{#AppVersion}
SetupIconFile=flutter_app\windows\runner\resources\app_icon.ico
Compression=lzma
SolidCompression=yes
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64
CloseApplications=force
RestartApplications=no
WizardStyle=modern
WizardSizePercent=120
ShowLanguageDialog=no
MinVersion=10.0
RestartIfNeededByRun=no
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: checkedonce
Name: "startmenuicon"; Description: "Create a &Start Menu shortcut"; GroupDescription: "Additional shortcuts:"

[Files]
Source: "{#SourceDir}\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\flutter_windows.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\webview_windows_plugin.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\WebView2Loader.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\url_launcher_windows_plugin.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\connectivity_plus_plugin.dll"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourceDir}\data\*"; DestDir: "{app}\data"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{tmp}\MicrosoftEdgeWebview2Setup.exe"; Parameters: "/install /silent"; \
  StatusMsg: "Installing Microsoft WebView2 Runtime (required)..."; \
  Flags: waituntilterminated skipifsilent; \
  Check: NeedsWebView2
Filename: "{app}\{#AppExeName}"; \
  Description: "{cm:LaunchProgram,{#StringChange(AppName, '&', '&&')}}"; \
  Flags: nowait postinstall skipifsilent

[Code]

function WebView2Installed: Boolean;
var
  regValue: String;
begin
  Result :=
    RegQueryStringValue(HKLM,
      'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', regValue) or
    RegQueryStringValue(HKLM,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', regValue) or
    RegQueryStringValue(HKCU,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
      'pv', regValue);
end;

function NeedsWebView2: Boolean;
begin
  Result := not WebView2Installed;
end;

// Download WebView2 before installation if not already present
procedure InitializeWizard;
begin
  if not WebView2Installed then
  begin
    DownloadTemporaryFile(
      'https://go.microsoft.com/fwlink/p/?LinkId=2124703',
      'MicrosoftEdgeWebview2Setup.exe',
      '',
      nil);
  end;
end;

// Add "Learn More" link on the Welcome page
var
  LearnMoreLink: TNewStaticText;

procedure LearnMoreClick(Sender: TObject);
var
  ErrorCode: Integer;
begin
  ShellExecAsOriginalUser('open', 'https://bdsportals.vercel.app', '', '', SW_SHOWNORMAL, ewNoWait, ErrorCode);
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpWelcome then
  begin
    LearnMoreLink := TNewStaticText.Create(WizardForm);
    LearnMoreLink.Parent := WizardForm.WelcomePage;
    LearnMoreLink.Caption := 'Learn more about SMS Portal →';
    LearnMoreLink.Left := WizardForm.WelcomeLabel2.Left;
    LearnMoreLink.Top := WizardForm.WelcomeLabel2.Top +
                         WizardForm.WelcomeLabel2.Height + 14;
    LearnMoreLink.Font.Color := $00AA4400;
    LearnMoreLink.Font.Style := [fsUnderline];
    LearnMoreLink.Cursor := crHand;
    LearnMoreLink.OnClick := @LearnMoreClick;
  end;
end;

function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo,
  MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
begin
  Result := MemoDirInfo + NewLine + MemoTasksInfo;
  if not WebView2Installed then
    Result := Result + NewLine + Space +
      '⚠ Microsoft WebView2 Runtime will be downloaded and installed.' + NewLine;
end;
