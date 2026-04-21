# LF App Feature Flowcharts

This document contains Mermaid.js flowcharts for all major features in the LF (Lost & Found) application.

## 🖨️ Need to Print These?

For printing, use the **print-optimized Graphviz versions** instead:
- Location: `docs/graphviz/print-*.dot`
- Features: 40% larger fonts, 2x thicker lines, simplified labels
- Best for: Printing, presentations, handouts
- Guide: See `docs/PRINTING_FLOWCHARTS_GUIDE.md`

**Quick Start**: Use `print-00-overview.dot` for a single-page overview perfect for printing!

---

## 1. Authentication & Registration Flow

```mermaid
flowchart TD
    Start([User Opens App]) --> Splash[Show Splash Screen]
    Splash --> CheckAuth{User Authenticated?}
    
    CheckAuth -->|Yes| Home[Navigate to Home]
    CheckAuth -->|No| AuthScreen[Show Auth Screen]
    
    AuthScreen --> ModeSelect{Select Mode}
    ModeSelect -->|Sign In| EnterEmail[Enter Email & Password]
    ModeSelect -->|Sign Up| EnterStudentID[Enter Student ID, Email & Password]
    
    EnterEmail --> SignIn[Call Supabase Auth]
    SignIn --> SignInSuccess{Success?}
    SignInSuccess -->|Yes| Home
    SignInSuccess -->|No| ShowError1[Show Error Alert]
    ShowError1 --> AuthScreen
    
    EnterStudentID --> ValidateInput{Valid Input?}
    ValidateInput -->|No| ShowError2[Show Validation Error]
    ShowError2 --> AuthScreen
    ValidateInput -->|Yes| CheckStudent[Query Students Table]
    
    CheckStudent --> StudentExists{Student Found?}
    StudentExists -->|No| NotInSystem[Alert: Not in System]
    NotInSystem --> AuthScreen
    
    StudentExists -->|Yes| CheckStatus{Status Active?}
    CheckStatus -->|No| InactiveAlert[Alert: Inactive]
    InactiveAlert --> AuthScreen
    
    CheckStatus -->|Yes| CheckLinked{Already Linked?}
    CheckLinked -->|Yes| AlreadyReg[Alert: Already Registered]
    AlreadyReg --> AuthScreen
    
    CheckLinked -->|No| CreateAuth[Create Auth Account]
    CreateAuth --> LinkStudent[Link auth_user_id to Student]
    LinkStudent --> Success[Alert: Account Created]
    Success --> AuthScreen
```

## 2. Item Registration Flow

```mermaid
flowchart TD
    Start([User Taps Register Item]) --> SelectCat[Show Category Selection]
    
    SelectCat --> ChooseCat{User Selects Category}
    ChooseCat --> LoadForm[Load Category-Specific Form]
    
    LoadForm --> FillForm[User Fills Form Fields]
    FillForm --> AddPhoto{Add Photo?}
    AddPhoto -->|Yes| PickImage[Open Image Picker]
    PickImage --> PhotoSelected[Photo Selected]
    AddPhoto -->|No| PhotoSelected
    
    PhotoSelected --> AddDesc[Add Description Optional]
    AddDesc --> Submit[User Taps Submit]
    
    Submit --> Validate{All Required Fields?}
    Validate -->|No| ShowError[Show Validation Error]
    ShowError --> FillForm
    
    Validate -->|Yes| UploadPhoto{Has Photo?}
    UploadPhoto -->|Yes| Upload[Upload to Supabase Storage]
    Upload --> GetURL[Get Public URL]
    UploadPhoto -->|No| GetURL
    
    GetURL --> GenQR[Generate QR Token UUID]
    GenQR --> InsertDB[Insert Item to Database]
    InsertDB --> Success{Success?}
    
    Success -->|No| DBError[Show Database Error]
    DBError --> FillForm
    
    Success -->|Yes| ShowSuccess[Show Success Alert]
    ShowSuccess --> Navigate[Navigate to My Items]
    Navigate --> End([End])
```

## 3. QR Code Scanning Flow

```mermaid
flowchart TD
    Start([User Taps Scan QR]) --> CheckPerm{Camera Permission?}
    
    CheckPerm -->|No| RequestPerm[Request Permission]
    RequestPerm --> PermGranted{Granted?}
    PermGranted -->|No| ShowPermError[Show Permission Screen]
    ShowPermError --> OpenSettings[User Opens Settings]
    OpenSettings --> End1([End])
    
    CheckPerm -->|Yes| OpenCamera[Open Camera View]
    PermGranted -->|Yes| OpenCamera
    
    OpenCamera --> Scanning[Scanning for QR Code]
    Scanning --> Detected{QR Detected?}
    
    Detected -->|No| Scanning
    Detected -->|Yes| ValidateQR{Valid LF QR?}
    
    ValidateQR -->|No| InvalidAlert[Alert: Invalid QR]
    InvalidAlert --> Scanning
    
    ValidateQR -->|Yes| ParseURL[Parse URL/Token]
    ParseURL --> ExtractID[Extract Item/Token ID]
    ExtractID --> ValidUUID{Valid UUID?}
    
    ValidUUID -->|No| InvalidAlert
    ValidUUID -->|Yes| Navigate[Navigate to /scan/token]
    Navigate --> LoadScan[Load Scan Action Screen]
    
    LoadScan --> ShowOptions[Show Action Options]
    ShowOptions --> UserAction{User Selects Action}
    
    UserAction -->|Have It| RecordHave[Record: have_it]
    UserAction -->|Turned In| RecordTurn[Record: turned_in]
    UserAction -->|Left It| RecordLeft[Record: left_it]
    UserAction -->|Contact| RecordContact[Record: contact_owner]
    
    RecordHave --> InsertScan[Insert Scan Event]
    RecordTurn --> InsertScan
    RecordLeft --> InsertScan
    RecordContact --> InsertScan
    
    InsertScan --> NotifyOwner[Create Notification]
    NotifyOwner --> UpdateStatus[Update Item Status]
    UpdateStatus --> Success[Show Success Message]
    Success --> End2([End])
```

## 4. Report Found Item Flow

```mermaid
flowchart TD
    Start([User Taps Report Found]) --> Step1[Show Category Selection]
    
    Step1 --> SelectCat{User Selects Category}
    SelectCat --> Step2[Navigate to Details Form]
    
    Step2 --> ShowForm[Show Category-Specific Form]
    ShowForm --> FillDetails[User Fills Item Details]
    
    FillDetails --> AddPhoto{Add Photo?}
    AddPhoto -->|Yes| PickImage[Open Image Picker]
    PickImage --> PhotoAdded[Photo Added]
    AddPhoto -->|No| RequiredPhoto[Show: Photo Required]
    RequiredPhoto --> AddPhoto
    
    PhotoAdded --> SelectLoc[Select Location]
    SelectLoc --> LocOther{Location = Other?}
    LocOther -->|Yes| EnterCustom[Enter Custom Location]
    LocOther -->|No| EnterCustom
    
    EnterCustom --> Submit[User Taps Submit]
    Submit --> Validate{All Required Fields?}
    
    Validate -->|No| ShowError[Show Validation Error]
    ShowError --> FillDetails
    
    Validate -->|Yes| UploadPhoto[Upload Photo to Storage]
    UploadPhoto --> GetURL[Get Public URL]
    
    GetURL --> InsertFound[Insert to found_items Table]
    InsertFound --> GetLost[Query Lost Items]
    
    GetLost --> RunAI[Run AI Matching]
    RunAI --> Matches{Matches Found?}
    
    Matches -->|Yes| InsertMatches[Insert AI Matches]
    InsertMatches --> NotifyOwners[Create Notifications]
    Matches -->|No| NotifyOwners
    
    NotifyOwners --> ShowSuccess[Show Success Alert]
    ShowSuccess --> MatchCount{Show Match Count}
    MatchCount --> Navigate[Navigate to Home]
    Navigate --> End([End])
```

## 5. AI Matching System Flow

```mermaid
flowchart TD
    Start([Found Item Reported]) --> GetLost[Query All Lost Items]
    
    GetLost --> HasLost{Lost Items Exist?}
    HasLost -->|No| End1([No Matches - End])
    
    HasLost -->|Yes| Loop[For Each Lost Item]
    Loop --> BuildPrompt[Build AI Prompt]
    
    BuildPrompt --> IncludeFound[Include Found Item Details]
    IncludeFound --> IncludeLost[Include Lost Item Details]
    IncludeLost --> CallGemini[Call Google Gemini API]
    
    CallGemini --> ParseResponse[Parse JSON Response]
    ParseResponse --> ValidJSON{Valid JSON?}
    
    ValidJSON -->|No| LogError[Log Parse Error]
    LogError --> NextItem{More Items?}
    
    ValidJSON -->|Yes| ExtractScore[Extract Match Score]
    ExtractScore --> CheckThreshold{Score >= 60?}
    
    CheckThreshold -->|No| NextItem
    CheckThreshold -->|Yes| AddMatch[Add to Matches Array]
    AddMatch --> NextItem
    
    NextItem -->|Yes| Loop
    NextItem -->|No| SortMatches[Sort by Score DESC]
    
    SortMatches --> InsertDB[Insert Matches to Database]
    InsertDB --> CreateNotif[Create Notifications]
    CreateNotif --> End2([Return Matches])
```

## 6. Match Review & Confirmation Flow

```mermaid
flowchart TD
    Start([User Receives Match Notification]) --> TapNotif[Tap Notification]
    TapNotif --> Navigate[Navigate to /found/id]
    
    Navigate --> LoadFound[Load Found Item Details]
    LoadFound --> LoadMatch[Load Match Info]
    
    LoadMatch --> Display[Display Item Details]
    Display --> ShowPhoto[Show Photo]
    ShowPhoto --> ShowDetails[Show Attributes]
    ShowDetails --> ShowAI[Show AI Reasoning]
    ShowAI --> ShowScore[Show Match Score]
    
    ShowScore --> UserDecision{User Decision}
    
    UserDecision -->|Confirm| ConfirmMatch[Update Match: confirmed]
    UserDecision -->|Reject| RejectMatch[Update Match: rejected]
    UserDecision -->|Back| End1([End])
    
    RejectMatch --> UpdateRejected[Update Status]
    UpdateRejected --> ShowRejected[Show Dismissed Message]
    ShowRejected --> End2([End])
    
    ConfirmMatch --> UpdateConfirmed[Update Match Status]
    UpdateConfirmed --> UpdateItem[Update Item: located]
    UpdateItem --> UpdateFound[Update Found: claimed]
    
    UpdateFound --> CheckThread{Chat Thread Exists?}
    CheckThread -->|Yes| GetThread[Get Thread ID]
    CheckThread -->|No| CreateThread[Create Chat Thread]
    
    CreateThread --> GetThread
    GetThread --> NavChat[Navigate to Chat]
    NavChat --> End3([End])
```

## 7. Chat/Messaging Flow

```mermaid
flowchart TD
    Start([User Opens Chat Tab]) --> FetchThreads[Fetch Chat Threads]
    
    FetchThreads --> HasThreads{Threads Exist?}
    HasThreads -->|No| ShowEmpty[Show Empty State]
    ShowEmpty --> End1([End])
    
    HasThreads -->|Yes| DisplayList[Display Thread List]
    DisplayList --> Subscribe[Subscribe to Real-time Updates]
    
    Subscribe --> UserSelect{User Selects Thread}
    UserSelect --> NavThread[Navigate to /chat/thread_id]
    
    NavThread --> LoadThread[Load Thread Details]
    LoadThread --> LoadMessages[Load Messages]
    LoadMessages --> DisplayChat[Display Chat Interface]
    
    DisplayChat --> SubMessages[Subscribe to New Messages]
    SubMessages --> UserAction{User Action}
    
    UserAction -->|Type Message| EnterText[Enter Message Text]
    UserAction -->|Back| End2([End])
    
    EnterText --> SendBtn[Tap Send Button]
    SendBtn --> Validate{Message Not Empty?}
    
    Validate -->|No| DisplayChat
    Validate -->|Yes| InsertMsg[Insert Message to DB]
    
    InsertMsg --> UpdateThread[Update Thread last_message]
    UpdateThread --> IncrementUnread[Increment Unread Count]
    IncrementUnread --> ClearInput[Clear Input Field]
    ClearInput --> DisplayChat
```

## 8. My Items Management Flow

```mermaid
flowchart TD
    Start([User Opens My Items]) --> FetchItems[Fetch User's Items]
    
    FetchItems --> GroupStatus[Group by Status]
    GroupStatus --> Display[Display Grouped Lists]
    
    Display --> ShowLost[Show Lost Items Section]
    ShowLost --> ShowLocated[Show Located Items Section]
    ShowLocated --> ShowRecovered[Show Recovered Items Section]
    ShowRecovered --> ShowSafe[Show Safe Items Section]
    
    ShowSafe --> UserAction{User Action}
    
    UserAction -->|Tap Item| NavDetail[Navigate to /item/id]
    UserAction -->|Pull Refresh| FetchItems
    UserAction -->|Tap FAB| NavRegister[Navigate to Register]
    
    NavDetail --> LoadItem[Load Item Details]
    LoadItem --> DisplayDetail[Display Item Info]
    DisplayDetail --> ShowQR[Show QR Code]
    ShowQR --> ShowStatus[Show Status Badge]
    
    ShowStatus --> UserDetailAction{User Action}
    
    UserDetailAction -->|Update Status| SelectStatus{Select New Status}
    UserDetailAction -->|Share QR| ShareQR[Share QR Code]
    UserDetailAction -->|Print QR| PrintQR[Print QR Code]
    UserDetailAction -->|Delete| ConfirmDelete{Confirm Delete?}
    
    SelectStatus -->|Safe| UpdateSafe[Update Status: safe]
    SelectStatus -->|Lost| UpdateLost[Update Status: lost]
    
    UpdateSafe --> RefreshDetail[Refresh Item Details]
    UpdateLost --> RefreshDetail
    RefreshDetail --> DisplayDetail
    
    ConfirmDelete -->|No| DisplayDetail
    ConfirmDelete -->|Yes| DeleteItem[Delete from Database]
    DeleteItem --> NavBack[Navigate Back]
    NavBack --> End1([End])
    
    ShareQR --> End2([End])
    PrintQR --> End3([End])
```

## 9. Notifications/Alerts Flow

```mermaid
flowchart TD
    Start([User Opens Notifications]) --> FetchData[Fetch Notifications Data]
    
    FetchData --> FetchNotif[Fetch from notifications Table]
    FetchNotif --> FetchScans[Fetch Scan Events]
    FetchScans --> FetchMatches[Fetch AI Matches]
    
    FetchMatches --> Combine[Combine All Notifications]
    Combine --> Sort[Sort by created_at DESC]
    
    Sort --> HasNotif{Has Notifications?}
    HasNotif -->|No| ShowEmpty[Show Empty State]
    ShowEmpty --> End1([End])
    
    HasNotif -->|Yes| DisplayList[Display Notification List]
    DisplayList --> GroupType[Group by Type]
    
    GroupType --> ShowFound[Show Found Items]
    ShowFound --> ShowMatches[Show AI Matches]
    ShowMatches --> ShowScans[Show QR Scans]
    
    ShowScans --> UserAction{User Taps Notification}
    
    UserAction -->|Scan Event| NavItem[Navigate to /item/id]
    UserAction -->|AI Match| NavFound[Navigate to /found/id]
    UserAction -->|Mark Read| MarkRead[Update read_at]
    
    NavItem --> End2([End])
    NavFound --> End3([End])
    MarkRead --> RefreshList[Refresh List]
    RefreshList --> DisplayList
```

## 10. Admin Dashboard Flow

```mermaid
flowchart TD
    Start([Admin Opens Admin Panel]) --> CheckRole{Is Admin?}
    
    CheckRole -->|No| Forbidden[Show 403 Error]
    Forbidden --> End1([End])
    
    CheckRole -->|Yes| LoadDash[Load Dashboard]
    LoadDash --> FetchStats[Fetch Statistics]
    
    FetchStats --> CountStudents[Count Active Students]
    CountStudents --> CountItems[Count Total Items]
    CountItems --> CountLost[Count Lost Items]
    CountLost --> CountSafe[Count Safe Items]
    CountSafe --> CountCustody[Count Items in Custody]
    
    CountCustody --> FetchRecent[Fetch Recent Items]
    FetchRecent --> DisplayDash[Display Dashboard]
    
    DisplayDash --> ShowStats[Show Stat Cards]
    ShowStats --> ShowRecent[Show Recent Items Table]
    ShowRecent --> ShowAuditSummary[Show Recent Audit Activity]
    
    ShowAuditSummary --> UserAction{User Action}
    
    UserAction -->|View Students| NavStudents[Navigate to /admin/students]
    UserAction -->|View Items| NavItems[Navigate to /admin/items]
    UserAction -->|View Custody| NavCustody[Navigate to /admin/custody]
    UserAction -->|View Users| NavUsers[Navigate to /admin/users]
    UserAction -->|View Audit| NavAudit[Navigate to /admin/audit]
    
    NavStudents --> LoadStudents[Load Students Management]
    NavItems --> LoadItems[Load Items Management]
    NavCustody --> LoadCustody[Load Custody Log]
    NavUsers --> LoadUsers[Load Users Management]
    NavAudit --> LoadAudit[Load Audit Log]
    
    LoadStudents --> End2([End])
    LoadItems --> End3([End])
    LoadCustody --> End4([End])
    LoadUsers --> End5([End])
    LoadAudit --> End6([End])
    
    style ShowAuditSummary fill:#e1f5ff
```

## 11. Student Management (Admin) Flow

```mermaid
flowchart TD
    Start([Admin Opens Students]) --> FetchStudents[Fetch All Students]
    
    FetchStudents --> DisplayList[Display Students List]
    DisplayList --> ShowFilters[Show Filter Options]
    
    ShowFilters --> UserAction{User Action}
    
    UserAction -->|Search| FilterList[Filter by Search Term]
    UserAction -->|Filter Status| FilterStatus[Filter by Status]
    UserAction -->|Add Student| ShowAddModal[Show Add Student Modal]
    UserAction -->|Edit Student| ShowEditModal[Show Edit Student Modal]
    UserAction -->|Delete Student| ConfirmDelete{Confirm Delete?}
    UserAction -->|Import CSV| ImportCSV[Import CSV File]
    
    FilterList --> DisplayList
    FilterStatus --> DisplayList
    
    ShowAddModal --> EnterDetails[Enter Student Details]
    EnterDetails --> ValidateAdd{Valid Input?}
    ValidateAdd -->|No| ShowError[Show Validation Error]
    ShowError --> EnterDetails
    
    ValidateAdd -->|Yes| InsertStudent[Insert to students Table]
    InsertStudent --> LogAdd[Log Audit: student.added]
    LogAdd --> CloseModal[Close Modal]
    CloseModal --> RefreshList[Refresh List]
    RefreshList --> DisplayList
    
    ShowEditModal --> EditDetails[Edit Student Details]
    EditDetails --> ValidateEdit{Valid Input?}
    ValidateEdit -->|No| ShowError
    
    ValidateEdit -->|Yes| UpdateStudent[Update Student Record]
    UpdateStudent --> LogUpdate[Log Audit: student.updated]
    LogUpdate --> CloseModal
    
    ConfirmDelete -->|No| DisplayList
    ConfirmDelete -->|Yes| DeleteRecord[Delete Student]
    DeleteRecord --> LogDelete[Log Audit: student.deleted]
    LogDelete --> RefreshList
    
    ImportCSV --> ParseCSV[Parse CSV Data]
    ParseCSV --> ValidateCSV{Valid Data?}
    ValidateCSV -->|No| ShowCSVError[Show CSV Error]
    ShowCSVError --> DisplayList
    ValidateCSV -->|Yes| BulkInsert[Bulk Insert Students]
    BulkInsert --> LogImport[Log Audit: student.imported]
    LogImport --> RefreshList
    
    style LogAdd fill:#e1f5ff
    style LogUpdate fill:#e1f5ff
    style LogDelete fill:#e1f5ff
    style LogImport fill:#e1f5ff
```

## 12. Custody Log (Admin) Flow

```mermaid
flowchart TD
    Start([Admin Opens Custody]) --> FetchLog[Fetch Custody Log]
    
    FetchLog --> DisplayLog[Display Log Entries]
    DisplayLog --> ShowFilters[Show Filter Options]
    
    ShowFilters --> UserAction{User Action}
    
    UserAction -->|Filter Action| FilterAction[Filter by Action Type]
    UserAction -->|Search| SearchLog[Search Log]
    UserAction -->|Add Entry| ShowAddModal[Show Add Entry Modal]
    
    FilterAction --> DisplayLog
    SearchLog --> DisplayLog
    
    ShowAddModal --> SelectItem[Select Item]
    SelectItem --> SelectAction{Select Action}
    
    SelectAction -->|Receive| RecordReceive[Record: receive]
    SelectAction -->|Claim| RecordClaim[Record: claim]
    SelectAction -->|Return| RecordReturn[Record: return]
    SelectAction -->|Dispose| RecordDispose[Record: dispose]
    
    RecordReceive --> EnterDetails[Enter Details]
    RecordClaim --> EnterDetails
    RecordReturn --> EnterDetails
    RecordDispose --> EnterDetails
    
    EnterDetails --> EnterHandler[Enter Handler Name]
    EnterHandler --> AddNotes[Add Notes Optional]
    AddNotes --> Submit[Submit Entry]
    
    Submit --> InsertLog[Insert to custody_log]
    InsertLog --> UpdateItem[Update Item Status]
    UpdateItem --> LogAudit[Log Audit: custody action]
    
    LogAudit --> CloseModal[Close Modal]
    CloseModal --> RefreshLog[Refresh Log]
    RefreshLog --> DisplayLog
    
    style LogAudit fill:#e1f5ff
```

## 13. Profile & Settings Flow

```mermaid
flowchart TD
    Start([User Opens Profile]) --> FetchUser[Fetch User Data]
    
    FetchUser --> FetchStudent[Fetch Student Info]
    FetchStudent --> FetchStats[Fetch User Stats]
    
    FetchStats --> Display[Display Profile]
    Display --> ShowInfo[Show User Info]
    ShowInfo --> ShowStats[Show Statistics]
    ShowStats --> ShowMenu[Show Menu Options]
    
    ShowMenu --> UserAction{User Action}
    
    UserAction -->|Account Settings| NavSettings[Navigate to Account Settings]
    UserAction -->|My Reports| NavReports[Navigate to My Reports]
    UserAction -->|Sign Out| ConfirmSignOut{Confirm Sign Out?}
    
    NavSettings --> LoadSettings[Load Settings Screen]
    LoadSettings --> ShowSettings[Show Settings Options]
    
    ShowSettings --> SettingAction{User Action}
    
    SettingAction -->|Update Name| EditName[Edit Name]
    SettingAction -->|Update Email| EditEmail[Edit Email]
    SettingAction -->|Change Password| ChangePass[Change Password]
    
    EditName --> UpdateProfile[Update User Metadata]
    EditEmail --> UpdateAuth[Update Auth Email]
    ChangePass --> UpdateAuth
    
    UpdateProfile --> ShowSuccess[Show Success Message]
    UpdateAuth --> ShowSuccess
    ShowSuccess --> LoadSettings
    
    NavReports --> LoadReports[Load Found Reports]
    LoadReports --> DisplayReports[Display Reports List]
    DisplayReports --> End2([End])
    
    ConfirmSignOut -->|No| Display
    ConfirmSignOut -->|Yes| SignOut[Call Supabase Sign Out]
    SignOut --> ClearSession[Clear Session]
    ClearSession --> NavAuth[Navigate to Auth Screen]
    NavAuth --> End3([End])
```

## 14. Home Dashboard Flow

```mermaid
flowchart TD
    Start([User Opens Home]) --> FetchUser[Fetch User Data]
    
    FetchUser --> FetchStats[Fetch User Statistics]
    FetchStats --> CountLost[Count Lost Items]
    CountLost --> CountMatches[Count Pending Matches]
    CountMatches --> CountSafe[Count Safe Items]
    
    CountSafe --> FetchActivity[Fetch Recent Activity]
    FetchActivity --> Subscribe[Subscribe to Real-time Updates]
    
    Subscribe --> Display[Display Dashboard]
    Display --> ShowGreeting[Show Personalized Greeting]
    ShowGreeting --> ShowQuickActions[Show Quick Action Buttons]
    ShowQuickActions --> ShowSummary[Show Summary Cards]
    ShowSummary --> ShowActivity[Show Recent Activity]
    
    ShowActivity --> UserAction{User Action}
    
    UserAction -->|I Lost Something| OpenLostModal[Open Lost Item Modal]
    UserAction -->|I Found Something| NavReportFound[Navigate to Report Found]
    UserAction -->|Scan QR| NavScanner[Navigate to QR Scanner]
    UserAction -->|View Lost Items| NavMyItems[Navigate to My Items]
    UserAction -->|View Matches| NavNotifications[Navigate to Notifications]
    
    OpenLostModal --> LoadUserItems[Load User's Safe Items]
    LoadUserItems --> HasItems{Has Items?}
    
    HasItems -->|No| NoItemsAlert[Alert: Register Item First]
    NoItemsAlert --> OfferRegister{Go to Register?}
    OfferRegister -->|Yes| NavRegister[Navigate to Register]
    OfferRegister -->|No| End1([End])
    
    HasItems -->|Yes| ShowItemList[Show Item Selection List]
    ShowItemList --> UserSelect{User Selects Item}
    
    UserSelect --> MarkLost[Update Item Status: lost]
    MarkLost --> CloseModal[Close Modal]
    CloseModal --> RefreshStats[Refresh Statistics]
    RefreshStats --> Display
    
    NavReportFound --> End2([End])
    NavScanner --> End3([End])
    NavMyItems --> End4([End])
    NavNotifications --> End5([End])
    NavRegister --> End6([End])
```

---

## How to Use These Flowcharts

1. **Copy any flowchart** from above
2. **Paste into Mermaid Live Editor**: https://mermaid.live/
3. **Or use in Markdown**: Most modern markdown viewers support Mermaid syntax
4. **GitHub/GitLab**: These platforms render Mermaid diagrams automatically

## Legend

- **Rectangles**: Process/Action steps
- **Diamonds**: Decision points
- **Rounded rectangles**: Start/End points
- **Arrows**: Flow direction
- **Colors**: Auto-generated by Mermaid

