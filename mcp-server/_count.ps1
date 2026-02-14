Get-ChildItem "C:\PRISM\data\materials" -Directory | ForEach-Object { 
  $n = $_.Name
  $c = (Get-ChildItem $_.FullName -Filter "*.json" | Measure-Object).Count
  Write-Output "$n : $c files"
}
