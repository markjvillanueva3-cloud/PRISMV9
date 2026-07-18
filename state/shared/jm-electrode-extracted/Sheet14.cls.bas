Attribute VB_Name = "Sheet14"
Attribute VB_Base = "0{00020820-0000-0000-C000-000000000046}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = True
Attribute VB_Control = "BuildButton, 1, 0, MSForms, CommandButton"
Attribute VB_Control = "Save, 2, 1, MSForms, CommandButton"
Attribute VB_Control = "OpenButton, 3, 2, MSForms, CommandButton"
Attribute VB_Control = "HideSW, 4, 3, MSForms, CommandButton"
Attribute VB_Control = "TestButton, 5, 4, MSForms, CommandButton"
Attribute VB_Control = "Test3, 6, 5, MSForms, CommandButton"
Attribute VB_Control = "LoadButton, 7, 6, MSForms, CommandButton"
Attribute VB_Control = "ExitButton, 8, 7, MSForms, CommandButton"
Attribute VB_Control = "MakeNewSheet, 9, 8, MSForms, CommandButton"
Private Sub BuildButton_Click()
 
Const sAddinName As String = "C:\Program Files\McamforSWX9\MastercamWorksX9.dll"
Dim swApp As Object
Set swApp = CreateObject("sldworks.application")
'status = swApp.LoadAddIn(sAddinName)
swApp.Visible = True
swApp.OpenDoc [FileLocationCell], 1
Dim Part As Object
Dim boolstatus As Boolean
Set Part = swApp.ActiveDoc
'Multipliers for:
'linear dimensions: *0.0254
'angles:  *3.14159/180
For i = 1 To [NumberOfDimensions]
j = i + 10
'Range("D7") = j
If Cells(j, 4) = "" Then GoTo Nexxt


multicell = Cells(j, 4)
commas = InStr(1, multicell, ",")
If commas > 0 Then
'x = 1
    Select Case Cells(j, 5)
        Case "LENGTH"
               v = 0.0254
        Case "ANGLE"
               v = 3.14159 / 180
    End Select
Do While commas > 0
    useablepart = Left(multicell, commas - 1)
    multicell = Right(multicell, Len(multicell) - commas)
    Range("D7") = multicell
    commas = InStr(1, multicell, ",")
        
    Part.Parameter(useablepart).SystemValue = Cells(j, 2) * v
    'x = x + 1
Loop
Part.Parameter(multicell).SystemValue = Cells(j, 2) * v
GoTo SkipNoComma
End If


    Select Case Cells(j, 5)
        Case "LENGTH"
            v = 0.0254
        Case "ANGLE"
            v = 3.14159 / 180
    End Select
    Part.Parameter(Cells(j, 4)).SystemValue = Cells(j, 2) * v
Nexxt:
SkipNoComma:
Next
Part.EditRebuild
'Dim ichar As Integer
'ichar = InStr(1, cl.Value, afterString, vbTextCompare)
'cl = Left(cl.Value, ichar + Len(afterString) - 1)
End Sub
Private Sub Save_Click()
Dim c As Range
Dim rng As Range
Dim cellname As String
'GoTo Skip1
Range("T2:AZ500").Copy Destination:=Range("T3")
Range("T2:AZ2").ClearContents
'Range("T2:AF2").ClearContents
Skip1:
For i = 1 To [NumberOfDimensions]
If Cells(10 + i, 2).HasFormula = True Then
GoTo DontRecord
End If

Cells(2, 22 + i) = Cells(10 + i, 2)
DontRecord:
Next

Range("T2") = [OrderCellSQ]
Range("U2") = Format(Now, "m/d/yy") '[DateCellSQ]
Range("V2") = Format(Now, "h:mm AM/PM")


[DateCellSQ] = Format(Now, "m/d/yy")
[TimeCellSQ] = Format(Now, "h:mm AM/PM")



'Code used to connect dimension names with saved dimension names
'For i = 0 To 34
'Cells(1, 23 + i).Formula = "=" & Cells(11 + i, 1).Address
'Next
End Sub
Private Sub HideSW_Click()
If Columns("E").Hidden = True Then
Columns("D").Hidden = False
Columns("E").Hidden = False
Columns("F").Hidden = False
Else
Columns("D").Hidden = True
Columns("E").Hidden = True
Columns("F").Hidden = True
End If

End Sub
Private Sub RenameBoxes()
For i = 1 To [NumberOfDimensions]
Shapes("TextBox " & i).TextFrame.Characters.Text = Cells(i + 10, 1).Value
'Shapes("TextBox " & i).Visible = True

'Shapes("TextBox " & i).Top = i * 20
'Shapes("TextBox " & i).Left = 362
'Shapes("TextBox " & i).Width = 70

Next

'For i = [NumberOfDimensions] + 1 To 10
'Shapes("TextBox " & i).Visible = False
'Next
End Sub
Private Sub ExitButton_Click()
Columns("G:S").Hidden = False
Shapes("LoadButton").Visible = False
Shapes("OpenButton").Visible = True
Shapes("ExitButton").Visible = False
End Sub
Private Sub LoadButton_Click()

Dim c As Range
'c = ActiveCell

[OrderCellSQ] = ActiveCell
[DateCellSQ] = ActiveCell.Offset(0, 1)
[TimeCellSQ] = ActiveCell.Offset(0, 2)


For i = 1 To [NumberOfDimensions]
If Cells(10 + i, 2).HasFormula = True Then
GoTo DontRecord3
End If
    Cells(10 + i, 2) = ActiveCell.Offset(0, 2 + i)
DontRecord3:
Next


Columns("G:S").Hidden = False
Shapes("LoadButton").Visible = False
Shapes("OpenButton").Visible = True
Shapes("ExitButton").Visible = False

End Sub
Private Sub OpenButton_Click()
Columns("D:S").Hidden = True
Shapes("LoadButton").Visible = True
Shapes("OpenButton").Visible = False
Shapes("ExitButton").Visible = True
End Sub
Private Sub Worksheet_Change(ByVal Target As Range)
    If Not Intersect(Target, Target.Worksheet.[NumberOfDimensions]) Is Nothing Then _
    Range(Cells(11, 2), Cells(11 + 22, 5)).Font.ColorIndex = 1
    Range(Cells(11, 1), Cells(11 + 22, 1)).Font.ColorIndex = 11
    Range(Cells(11 + [NumberOfDimensions], 1), Cells(11 + 34, 5)).Font.ColorIndex = 2

    If Intersect(Target, Range("RangeofDimNames")) Is Nothing Then Exit Sub
    Call RenameBoxes
End Sub



Private Sub MakeNewSheet_Click()
    'Replace "Sheet1" with the name of the sheet to be copied.
    ActiveWorkbook.Sheets("Template").Copy _
       before:=ActiveWorkbook.Sheets("Template")
    ActiveSheet.Shapes("MakeNewSheet").Visible = False
    ActiveSheet.Range("A1").Font.ColorIndex = 2
    Randomize
   LRandomNumber = Int((56 - 4 + 1) * Rnd + 4)
    ActiveSheet.Range("A1").Interior.ColorIndex = LRandomNumber
    myValue = InputBox("Input new model name.")
    ActiveSheet.Range("A1").Value = UCase(myValue)
    'myValue = InputBox("Give me some input", "Hi", 1)
    ActiveSheet.Name = myValue

End Sub




