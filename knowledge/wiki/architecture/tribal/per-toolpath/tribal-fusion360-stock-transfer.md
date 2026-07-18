---
name: tribal-fusion360-stock-transfer
software: fusion360
toolpath: stock-transfer
displayName: "Stock Transfer"
category: turning
coverageStatus: youtube+pdf
ytTipCount: 2
pdfTipCount: 1
generatedAt: 2026-05-27T03:30:20.817Z
---

# fusion360 — Stock Transfer

**Category:** turning · **Slug:** `stock-transfer`

## Fields (UI dialog inputs)

- **Pickup Position**

## Buttons (UI actions)

- `Generate`

## Coverage status

Coverage: **youtube+pdf** · 2 YouTube tips · 1 PDF tips. Each tip below cites source per kilo soul provenance rule.

## Tips from YouTube transcripts

### Mastercam Multi Axis Class @121s

**Source:** [Derek Goodwin](https://www.youtube.com/watch?v=eATCcxTSniY&t=91s) · video `eATCcxTSniY`

```
programming process using solid geometry programming process using solid geometry created in master cam or other CAD created in master cam or other CAD created in master cam or other CAD packages such as solid works or packages such as solid works or packages such as solid works or proengineer proengineer proengineer we will do an overview of multiaxis tool we will do an overview of multiaxis tool we will do an overview of multiaxis tool paths true multiaxis programming is paths true multiaxis programming is paths true multiaxis programming is covered in more depth in a future covered in more depth in a future covered in more depth in a future course we will cover CNC lathe course we will cover CNC lathe course we will cover CNC lathe programming including all of the programming including all of the programming including all of the standard tool paths live tooling and standard tool paths live tooling and standard tool paths live tooling and stock transfer to a subspindle to stock transfer to a subspindle to stock transfer to a subspindle to machine the machine the machine the backside next navigate to eapen this.net backside next navigate to eapen this.net backside next navigate to eapen this.net register for an account and then check register for an account and then check register for an account and then check your email account for the authorization your email account for the authorization your email account for the authorization code click on the link to activate your code
```

### Mastercam Multi Axis Class @124s

**Source:** [Derek Goodwin](https://www.youtube.com/watch?v=eATCcxTSniY&t=94s) · video `eATCcxTSniY`

```
created in master cam or other CAD created in master cam or other CAD packages such as solid works or packages such as solid works or packages such as solid works or proengineer proengineer proengineer we will do an overview of multiaxis tool we will do an overview of multiaxis tool we will do an overview of multiaxis tool paths true multiaxis programming is paths true multiaxis programming is paths true multiaxis programming is covered in more depth in a future covered in more depth in a future covered in more depth in a future course we will cover CNC lathe course we will cover CNC lathe course we will cover CNC lathe programming including all of the programming including all of the programming including all of the standard tool paths live tooling and standard tool paths live tooling and standard tool paths live tooling and stock transfer to a subspindle to stock transfer to a subspindle to stock transfer to a subspindle to machine the machine the machine the backside next navigate to eapen this.net backside next navigate to eapen this.net backside next navigate to eapen this.net register for an account and then check register for an account and then check register for an account and then check your email account for the authorization your email account for the authorization your email account for the authorization code click on the link to activate your code click on the link to activate your code click on the link to activate your account you can then navigate back to acc
```

## Tips from PDF extraction (pypdf)

### TRIBAL + WIKI/InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf — page 247

**Source:** `TRIBAL + WIKI/InventorCAM2024_Turning_&_Mill-Turn_Training_Course.pdf` page 247 · notability 0.6

```
7. Operation Sequence Manager
241
• To start sequencing the operations on the back spindle, right click the first operation defined on the 
lower turret and click Add new Workpiece.
The Add new Workpiece operation can be defined on the operation of  your choice to start the 
machining from there. However, it is a general practice to add it on the first operation defined 
on the lower turret. You can split the CAM Tree order to create separate Workpieces (Machining 
processes) for continuous machining process on CNC machine (loop machining).
• In the Operation Sequence Manager  window, Setup should always be the first operation. Setup is 
loading new Stock, according to the Setup table. When you open the Operation Sequence Manager  
window, and if  the Setup operation is not seen as the first operation, then you must drag and place is at 
the top of  the operations as the defined stock must be visible in the first operation.
• The operation of  stock transfer is a machine control operation with two or more tables involved. As 
a result of  this operation, the stock changes the holding Table. You can achieve this by Manual Part 
Transfer or Close on Stock command.
• The operation of  stock release cannot be moved below the part transfer operation. However, it can 
be moved after the last operation on back spindle in the Operation Sequence Manager window. Stock 
release is a machine control operation with Release Stock command which deletes the stock from the 
active table.
• Th
```
