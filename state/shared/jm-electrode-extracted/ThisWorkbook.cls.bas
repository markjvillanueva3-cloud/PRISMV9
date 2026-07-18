Attribute VB_Name = "ThisWorkbook"
Attribute VB_Base = "0{00020819-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Private Sub Workbook_Open()
Dim PathString As String
PathString = Application.ActiveWorkbook.Path
'SWMasterFilesLoc = PathString
Sheets("Sheet1").Range("C1") = PathString

'Sheets("Email Nick").Range("P4") = PathString & "\Master Programs for Plugs\"
'Sheets("Email Nick").Range("P5") = PathString & "\Saved SW Plugs\"
End Sub





