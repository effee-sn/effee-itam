<#
    ITAM inventory agent
    --------------------
    Collects this Windows machine's hardware + OS inventory and POSTs it to the ITAM server's
    /api/inventory endpoint (GLPI-agent style). Run it on each machine you want inventoried.

    The server matches the report to an existing computer by UUID (then serial) and updates it;
    a machine it doesn't recognise shows up under "Discovered" in the app for an admin to onboard.

    USAGE
      1. Set $ServerUrl below to your ITAM address (no trailing slash).
      2. If you set INVENTORY_TOKEN on the server, put the same value in $Token; otherwise leave it "".
      3. Run it. Administrator rights are NOT required — every class used here is readable by a
         normal user (verified: serial, UUID, OS, BIOS, network, components, attached monitors
         and Entra/Intune state all come back unelevated):
             powershell -ExecutionPolicy Bypass -File .\inventory-agent.ps1
         Easier still: use run-inventory.bat in this folder and just double-click it.
      4. You can override the URL/token without editing the file:
             .\inventory-agent.ps1 -ServerUrl "https://itam.example.com" -Token "secret"

    Requires Windows PowerShell 5.1+ (built into Windows 10/11). No install needed.
#>

param(
    [string]$ServerUrl = "https://itam.yourcompany.internal",
    [string]$Token = ""
)

$ErrorActionPreference = "Stop"

# Log file: one per run, in TEMP, named by timestamp so runs never overwrite each other. The full
# path is printed at the end (and on any failure) so it's easy to find and attach when reporting.
$LogFile = Join-Path $env:TEMP ("ITAM-Agent-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))

# Status lines: shown on screen AND written to the log, timestamped.
function Write-Log {
    param([string]$Message, [string]$Color = $null)

    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    if ($Color) { Write-Host $Message -ForegroundColor $Color } else { Write-Host $Message }
    # -Encoding UTF8 keeps monitor/OS names with non-ASCII characters readable in the log.
    Add-Content -Path $LogFile -Value "[$time] $Message" -Encoding UTF8
}

# Detail (the full payload, server response bodies): written to the LOG ONLY, never the screen,
# because it's large. This is the part that actually lets you see which field a 400 rejected.
function Write-LogDetail {
    param([string]$Message)
    Add-Content -Path $LogFile -Value $Message -Encoding UTF8
}

# Pull the response BODY out of a failed web request. Critical: PowerShell 5.1 frequently leaves
# $err.ErrorDetails.Message EMPTY even when the server DID send a body — so on a 400 the actual
# "which field was wrong" text is lost unless we read the response stream ourselves. This is the
# difference between a log that says "Bad Request" and one that says exactly what to fix.
function Read-ErrorBody($err) {
    if ($err.ErrorDetails -and $err.ErrorDetails.Message) { return $err.ErrorDetails.Message }
    try {
        $resp = $err.Exception.Response
        if ($resp) {
            $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
            $body = $reader.ReadToEnd()
            $reader.Close()
            return $body
        }
    } catch {}
    return $null
}

Write-Log "===================================================="
Write-Log "ITAM Inventory Agent Started"
Write-Log "Computer: $env:COMPUTERNAME"
Write-Log "User: $env:USERNAME"
Write-Log "PowerShell: $($PSVersionTable.PSVersion)"
Write-Log "Server: $ServerUrl"
Write-Log "===================================================="

# Fail fast, before spending time collecting, if the URL was never filled in. Without this the run
# ends in an opaque "unable to connect" against a hostname that doesn't exist.
if ($ServerUrl -like "*itam.yourcompany.internal*") {
    Write-Host "This script still has the placeholder server address." -ForegroundColor Red
    Write-Host "Either edit `$ServerUrl at the top of the file, or pass it on the command line:" -ForegroundColor Yellow
    Write-Host '    .\inventory-agent.ps1 -ServerUrl "https://itam.yourcompany.com"' -ForegroundColor Yellow
    exit 1
}

# If your server uses a self-signed certificate, uncomment the next line to skip TLS validation.
# [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

# Read one CIM instance without letting a missing/blocked class abort the whole run.
function Get-CimSafe([string]$Class) {
    try { return Get-CimInstance -ClassName $Class -ErrorAction Stop } catch { return $null }
}

function Clean([string]$Value) {
    if ($null -eq $Value) { return $null }
    $v = $Value.Trim()
    if ($v -eq "" -or $v -match "^(To be filled by O\.E\.M\.|Default string|System Product Name|None|Not Applicable)$") { return $null }
    return $v
}

# Recursively drop keys whose value is null before sending. The payload is built with fixed keys
# (a component always has a serialNumber slot, the os block always has every field), and unknown
# ones come back null from Clean. The server's schema treats a MISSING field as fine but rejects an
# explicit null - so a machine whose motherboard has no serial, or whose WMI omits an OS field, gets
# a 400 unless the nulls are stripped here first. Stripping makes null behave like "not reported".
function Remove-NullValues($obj) {
    if ($obj -is [System.Collections.IDictionary]) {
        $clean = @{}
        foreach ($key in @($obj.Keys)) {
            $val = Remove-NullValues $obj[$key]
            if ($null -ne $val) { $clean[$key] = $val }
        }
        return $clean
    }
    if ($obj -is [System.Collections.IEnumerable] -and $obj -isnot [string]) {
        $arr = @()
        foreach ($item in $obj) { $arr += , (Remove-NullValues $item) }
        return , $arr
    }
    return $obj
}

# Azure AD (Entra) / on-prem domain join, and Intune (MDM) enrollment.
#   dsregcmd is the authoritative source for the join state and tenant.
#   The registry enrollment with ProviderID "MS DM Server" is the definitive Intune signal
#   (WMI just reports "WORKGROUP" for an Entra-joined machine, which is misleading).
function Get-JoinInfo {
    $info = [ordered]@{ AzureAdJoined = $false; DomainJoined = $false; TenantName = $null; IntuneEnrolled = $false }
    try {
        foreach ($line in (& dsregcmd /status 2>$null)) {
            if ($line -match 'AzureAdJoined\s*:\s*YES') { $info.AzureAdJoined = $true }
            elseif ($line -match 'DomainJoined\s*:\s*YES') { $info.DomainJoined = $true }
            elseif ($line -match 'TenantName\s*:\s*(.+?)\s*$') { $info.TenantName = $Matches[1].Trim() }
            elseif ($line -match 'MdmUrl\s*:\s*\S+') { $info.IntuneEnrolled = $true }
        }
    } catch {}
    try {
        $base = "HKLM:\SOFTWARE\Microsoft\Enrollments"
        if (Test-Path $base) {
            foreach ($k in (Get-ChildItem $base -ErrorAction SilentlyContinue)) {
                $p = Get-ItemProperty $k.PSPath -ErrorAction SilentlyContinue
                if ($p.ProviderID -and $p.ProviderID.Trim() -eq "MS DM Server" -and $p.EnrollmentState -eq 1) {
                    $info.IntuneEnrolled = $true
                }
            }
        }
    } catch {}
    return $info
}

# Decodes an EDID UInt16[] char array (as WmiMonitorID returns) to a clean string.
function ConvertFrom-EdidChars([UInt16[]]$arr) {
    if (-not $arr) { return "" }
    return (-join ($arr | Where-Object { $_ -gt 0 } | ForEach-Object { [char]$_ })).Trim()
}

# EDID reports the maker as a 3-letter PnP ID ("LEN"), which is what would otherwise land in the
# asset's Brand field. Expand the ones we actually buy; anything unknown falls back to the code
# itself rather than guessing.
$PnpVendors = @{
    "LEN" = "Lenovo";    "IVM" = "iiyama";    "DEL" = "Dell";      "HWP" = "HP";
    "HPN" = "HP";        "SAM" = "Samsung";   "SNY" = "Sony";      "GSM" = "LG";
    "AUO" = "AU Optronics"; "CMN" = "Chi Mei Innolux"; "BOE" = "BOE";
    "ACI" = "Asus";      "ACR" = "Acer";      "AOC" = "AOC";       "BNQ" = "BenQ";
    "PHL" = "Philips";   "VSC" = "ViewSonic"; "MSI" = "MSI";       "NEC" = "NEC";
    "APP" = "Apple";     "LGD" = "LG Display"; "SHP" = "Sharp";    "TSB" = "Toshiba";
    "FUS" = "Fujitsu";   "CPQ" = "Compaq";    "ENC" = "Eizo";      "HSD" = "HannStar";
}
function Resolve-VendorName([string]$code) {
    if (-not $code) { return "" }
    $key = $code.Trim().ToUpper()
    if ($PnpVendors.ContainsKey($key)) { return $PnpVendors[$key] }
    return $code.Trim()
}

# D3DKMDT_VIDEO_OUTPUT_TECHNOLOGY -> the port the display is plugged into. Only the port actually
# IN USE is knowable; EDID does not enumerate a monitor's other sockets, so the server is told about
# this one alone and never clears the others.
function Resolve-PortName([int64]$tech) {
    switch ($tech) {
        0  { "VGA" }
        4  { "DVI" }
        5  { "HDMI" }
        10 { "DisplayPort" }
        default { $null }
    }
}

# Every display currently attached, with everything Windows can actually tell us about it. Fields:
#   isInternal       - the laptop's own panel (identified by CONNECTION TYPE, which is reliable,
#                      rather than by a missing serial, which also happens on real external monitors)
#   serialNumber     - EDID serial, or "" when the display doesn't publish one (common on Lenovo)
#   manufacturer     - expanded vendor name; manufacturerCode keeps the raw EDID PnP ID
#   resolution/refreshRateHz - the display's NATIVE mode (see note below)
#   connectedVia     - the port in use right now
#   hasSpeakers/hasWebcam    - only when there's positive evidence (see Get-DisplayPeripherals)
#
# Not obtainable from Windows for any monitor, and therefore never sent: panel type (IPS/TN/VA),
# the vendor's MTM/part number, which other ports the monitor has, USB hub, microphone, pivot,
# height adjustment and VESA size. Those stay manual fields in ITAM.
function Get-AttachedDisplays {
    $out = New-Object System.Collections.ArrayList
    try {
        $ids = @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorID -ErrorAction Stop)
        $params = @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue)
        $conn = @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorConnectionParams -ErrorAction SilentlyContinue)
        $modes = @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorListedSupportedSourceModes -ErrorAction SilentlyContinue)

        $sizeByInstance = @{}
        foreach ($p in $params) {
            if ($p.MaxHorizontalImageSize -and $p.MaxVerticalImageSize) {
                $h = [double]$p.MaxHorizontalImageSize; $v = [double]$p.MaxVerticalImageSize
                $sizeByInstance[$p.InstanceName] = [math]::Round([math]::Sqrt(($h * $h) + ($v * $v)) / 2.54, 1)
            }
        }
        # D3DKMDT video output technology: 0x80000000 = internal, 11 = embedded DisplayPort,
        # 13 = embedded UDI. Anything else is a real external cable (HDMI, DP, VGA...).
        $techByInstance = @{}
        foreach ($c in $conn) { $techByInstance[$c.InstanceName] = [int64]$c.VideoOutputTechnology }

        # Native mode = the PREFERRED entry, which is NOT the highest one in the list. A 1080p panel
        # commonly also advertises 1280x1024@75, so picking "max" would report 75 Hz on a 60 Hz
        # monitor. PreferredMonitorSourceModeIndex is the display's own declared native timing.
        $modeByInstance = @{}
        foreach ($ms in $modes) {
            $list = @($ms.MonitorSourceModes)
            $idx = [int]$ms.PreferredMonitorSourceModeIndex
            if ($list.Count -eq 0 -or $idx -lt 0 -or $idx -ge $list.Count) { continue }
            $sm = $list[$idx]
            if (-not $sm.HorizontalActivePixels -or -not $sm.VerticalActivePixels) { continue }
            $hz = $null
            if ($sm.VerticalRefreshRateDenominator -and [double]$sm.VerticalRefreshRateDenominator -ne 0) {
                $hz = [int][math]::Round([double]$sm.VerticalRefreshRateNumerator / [double]$sm.VerticalRefreshRateDenominator, 0)
            } elseif ($sm.VerticalRefreshRateNumerator) {
                $hz = [int]$sm.VerticalRefreshRateNumerator
            }
            $modeByInstance[$ms.InstanceName] = @{
                resolution    = "$($sm.HorizontalActivePixels)x$($sm.VerticalActivePixels)"
                refreshRateHz = $hz
            }
        }

        $peripherals = Get-DisplayPeripherals

        foreach ($m in $ids) {
            $tech = if ($techByInstance.ContainsKey($m.InstanceName)) { $techByInstance[$m.InstanceName] } else { -1 }
            $isInternal = ($tech -eq 2147483648) -or ($tech -eq -2147483648) -or ($tech -eq 11) -or ($tech -eq 13)
            $serial = ConvertFrom-EdidChars $m.SerialNumberID
            if ($serial -eq "0" -or $serial.Length -lt 2) { $serial = "" }  # placeholder = no serial
            $code = ConvertFrom-EdidChars $m.ManufacturerName
            $model = ConvertFrom-EdidChars $m.UserFriendlyName
            $mode = if ($modeByInstance.ContainsKey($m.InstanceName)) { $modeByInstance[$m.InstanceName] } else { $null }

            [void]$out.Add(@{
                isInternal       = $isInternal
                serialNumber     = $serial
                manufacturerCode = $code
                manufacturer     = (Resolve-VendorName $code)
                model            = $model
                sizeInches       = if ($sizeByInstance.ContainsKey($m.InstanceName)) { $sizeByInstance[$m.InstanceName] } else { $null }
                resolution       = if ($mode) { $mode.resolution } else { $null }
                refreshRateHz    = if ($mode) { $mode.refreshRateHz } else { $null }
                connectedVia     = (Resolve-PortName $tech)
                hasSpeakers      = (Test-NamedDevice $peripherals.Audio $model)
                hasWebcam        = (Test-NamedDevice $peripherals.Cameras $model)
            })
        }
    }
    catch {}
    return @($out)
}

# Audio endpoints and cameras, used to tell whether a monitor has built-in speakers or a webcam.
# A monitor's own speakers appear as an endpoint carrying the display's model name, e.g.
# "T22v-10 (HD Audio Driver for Display Audio)" — that name match is the evidence.
function Get-DisplayPeripherals {
    $result = @{ Audio = @(); Cameras = @() }
    try {
        $pnp = @(Get-CimInstance Win32_PnPEntity -ErrorAction Stop)
        $result.Audio = @($pnp | Where-Object { $_.PNPClass -eq "AudioEndpoint" } | ForEach-Object { $_.Name })
        $result.Cameras = @($pnp | Where-Object { $_.PNPClass -in @("Camera", "Image") } | ForEach-Object { $_.Name })
    }
    catch {}
    return $result
}

# True only when a device name contains the display's model. Deliberately conservative: it can miss
# a generically-named device, but it will not claim a feature the monitor may not have.
function Test-NamedDevice([string[]]$names, [string]$model) {
    if (-not $model -or $model.Trim().Length -lt 3 -or -not $names) { return $false }
    $needle = $model.Trim()
    foreach ($n in $names) {
        if ($n -and $n.IndexOf($needle, [StringComparison]::OrdinalIgnoreCase) -ge 0) { return $true }
    }
    return $false
}

Write-Log "Collecting inventory..." "Cyan"

$cs      = Get-CimSafe "Win32_ComputerSystem"       | Select-Object -First 1
$csp     = Get-CimSafe "Win32_ComputerSystemProduct"| Select-Object -First 1
$bios    = Get-CimSafe "Win32_BIOS"                 | Select-Object -First 1
$os      = Get-CimSafe "Win32_OperatingSystem"      | Select-Object -First 1
$board   = Get-CimSafe "Win32_BaseBoard"            | Select-Object -First 1
$cpus    = @(Get-CimSafe "Win32_Processor")
$mem     = @(Get-CimSafe "Win32_PhysicalMemory")
$disks   = @(Get-CimSafe "Win32_DiskDrive")
$gpus    = @(Get-CimSafe "Win32_VideoController")
$join    = Get-JoinInfo
$displays = @(Get-AttachedDisplays)
$externals = @($displays | Where-Object { -not $_.isInternal })
# Send every external display that carries SOMETHING identifying. A serial lets the server link it
# to an existing Monitor asset outright; without one it can only be parked under Discovered by
# model, so a display with neither serial nor model is unusable and dropped here.
$monitors = @($externals | Where-Object { $_.serialNumber -or $_.model } | ForEach-Object {
        $m = @{}
        if ($_.serialNumber) { $m.serialNumber = $_.serialNumber }
        if ($_.manufacturer) { $m.manufacturer = $_.manufacturer }
        if ($_.manufacturerCode) { $m.manufacturerCode = $_.manufacturerCode }
        if ($_.model) { $m.model = $_.model }
        if ($_.sizeInches) { $m.sizeInches = $_.sizeInches }
        if ($_.resolution) { $m.resolution = $_.resolution }
        if ($_.refreshRateHz) { $m.refreshRateHz = $_.refreshRateHz }
        if ($_.connectedVia) { $m.connectedVia = $_.connectedVia }
        # Sent only when true — see Test-NamedDevice. A false would be "no evidence", not "absent",
        # and must never overwrite a value someone ticked by hand in ITAM.
        if ($_.hasSpeakers) { $m.hasSpeakers = $true }
        if ($_.hasWebcam) { $m.hasWebcam = $true }
        $m
    })
$noSerialExternals = @($externals | Where-Object { -not $_.serialNumber })
$unidentifiable = @($externals | Where-Object { -not $_.serialNumber -and -not $_.model })

# Primary network adapter: first IP-enabled config with a real IPv4 address.
$net = @(Get-CimSafe "Win32_NetworkAdapterConfiguration" | Where-Object { $_.IPEnabled }) |
    Where-Object { $_.IPAddress -and ($_.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' }) } |
    Select-Object -First 1
$ipv4 = if ($net) { ($net.IPAddress | Where-Object { $_ -match '^\d+\.\d+\.\d+\.\d+$' } | Select-Object -First 1) } else { $null }

# --- Build the components list --------------------------------------------------------------
$components = New-Object System.Collections.ArrayList

foreach ($cpu in $cpus) {
    if (-not $cpu) { continue }
    [void]$components.Add(@{
        type          = "PROCESSOR"
        name          = Clean $cpu.Name
        specification = ("{0} cores / {1} threads" -f $cpu.NumberOfCores, $cpu.NumberOfLogicalProcessors)
        quantity      = 1
    })
}
foreach ($m in $mem) {
    if (-not $m -or -not $m.Capacity) { continue }
    $gb = [math]::Round($m.Capacity / 1GB)
    [void]$components.Add(@{
        type          = "MEMORY"
        name          = ("{0} GB module" -f $gb)
        specification = if ($m.Speed) { ("{0} MHz" -f $m.Speed) } else { $null }
        capacity      = ("{0} GB" -f $gb)
        serialNumber  = Clean $m.SerialNumber
        quantity      = 1
    })
}
foreach ($d in $disks) {
    if (-not $d -or -not $d.Size) { continue }
    $gb = [math]::Round($d.Size / 1GB)
    [void]$components.Add(@{
        type          = "STORAGE"
        name          = Clean $d.Model
        capacity      = ("{0} GB" -f $gb)
        serialNumber  = Clean $d.SerialNumber
        quantity      = 1
    })
}
foreach ($g in $gpus) {
    if (-not $g) { continue }
    [void]$components.Add(@{ type = "GRAPHICS"; name = Clean $g.Name; quantity = 1 })
}
if ($board) {
    [void]$components.Add(@{
        type          = "MOTHERBOARD"
        name          = (@(Clean $board.Manufacturer, Clean $board.Product) | Where-Object { $_ }) -join " "
        serialNumber  = Clean $board.SerialNumber
        quantity      = 1
    })
}
# Drop any component whose name came out blank — the server requires a name.
$components = @($components | Where-Object { $_.name -and $_.name.Trim() -ne "" })

# --- OS install date -> ISO ------------------------------------------------------------------
$installDate = $null
if ($os -and $os.InstallDate) {
    try { $installDate = ([datetime]$os.InstallDate).ToString("yyyy-MM-dd") } catch { $installDate = $null }
}

# --- Assemble the payload --------------------------------------------------------------------
$payload = @{
    uuid         = Clean $csp.UUID
    serialNumber = Clean $bios.SerialNumber
    hostname     = Clean $cs.Name
    manufacturer = Clean $cs.Manufacturer
    model        = Clean $cs.Model
    macAddress   = if ($net) { Clean $net.MACAddress } else { $null }
    ipAddress    = $ipv4
    biosVersion  = if ($bios) { Clean ($bios.SMBIOSBIOSVersion) } else { $null }
    intuneEnrolled = $join.IntuneEnrolled
    os           = @{
        name         = if ($os) { Clean $os.Caption } else { $null }
        version      = if ($os) { Clean $os.Version } else { $null }
        architecture = if ($os) { Clean $os.OSArchitecture } else { $null }
        installDate  = $installDate
    }
    components   = $components
}

# Domain / workgroup / cloud. On-prem AD domain wins; an Azure AD (Entra) joined machine is NOT
# a workgroup even though WMI reports "WORKGROUP", so record its tenant as the domain and leave
# workgroup blank. A genuine workgroup machine falls through to the last branch.
if ($cs -and $cs.PartOfDomain) { $payload.domain = Clean $cs.Domain }
elseif ($join.AzureAdJoined) { if ($join.TenantName) { $payload.domain = Clean $join.TenantName } }
elseif ($cs) { $payload.workgroup = Clean $cs.Workgroup }

# External monitors. The server links each to the Monitor asset with that serial, and parks the
# rest under Discovered so an admin can onboard them with a tag.
if ($monitors.Count -gt 0) { $payload.monitors = $monitors }

if (-not $payload.uuid -and -not $payload.serialNumber) {
    Write-Host "This machine reports neither a UUID nor a serial number; the server can't match it. Aborting." -ForegroundColor Red
    exit 1
}

# Drop null-valued keys so "not reported" reads as absent, not as an explicit null the server rejects.
$payload = Remove-NullValues $payload
$json = $payload | ConvertTo-Json -Depth 6 -Compress

# Record the EXACT payload in the log (pretty-printed, file only) before sending. If the server
# rejects it with a 400, this is what you compare the error against to find the offending value.
Write-LogDetail "---------------- payload being sent ----------------"
Write-LogDetail ($payload | ConvertTo-Json -Depth 6)
Write-LogDetail "---------------- end payload ----------------"

# --- Send it ---------------------------------------------------------------------------------
$headers = @{ "Content-Type" = "application/json" }
if ($Token -and $Token.Trim() -ne "") { $headers["X-Inventory-Token"] = $Token }

$endpoint = "$($ServerUrl.TrimEnd('/'))/api/inventory"

# Report every attached display honestly: which are being sent and on what identity, which is the
# built-in panel, and which are unusable.
if ($externals.Count -eq 0) {
    Write-Host "No external monitors attached (only this machine's built-in panel)." -ForegroundColor DarkYellow
} else {
    Write-Host "External displays attached: $($externals.Count)" -ForegroundColor Cyan
    foreach ($m in $monitors) {
        $sz = if ($m.sizeInches) { " $($m.sizeInches)`"" } else { "" }
        $idBit = if ($m.serialNumber) { "serial $($m.serialNumber)" } else { "no serial published" }
        Write-Host ("  - {0} {1}{2} ({3})" -f $m.manufacturer, $m.model, $sz, $idBit) -ForegroundColor Cyan

        $specs = New-Object System.Collections.ArrayList
        if ($m.resolution) {
            $mode = $m.resolution
            if ($m.refreshRateHz) { $mode = "$mode @ $($m.refreshRateHz) Hz" }
            [void]$specs.Add($mode)
        }
        if ($m.connectedVia) { [void]$specs.Add("via $($m.connectedVia)") }
        if ($m.hasSpeakers) { [void]$specs.Add("speakers") }
        if ($m.hasWebcam) { [void]$specs.Add("webcam") }
        if ($specs.Count -gt 0) { Write-Host ("      $($specs -join ', ')") -ForegroundColor DarkCyan }
    }
    if ($noSerialExternals.Count -gt 0) {
        Write-Host "    A display with no serial is identified by its model plus this machine, since" -ForegroundColor DarkYellow
        Write-Host "    there's no serial to match it on." -ForegroundColor DarkYellow
    }
    if ($unidentifiable.Count -gt 0) {
        Write-Host ("  - {0} display(s) reported neither serial nor model -> skipped, nothing to identify them by" -f $unidentifiable.Count) -ForegroundColor Yellow
    }
}

$uuidShown   = if ($payload.uuid) { $payload.uuid } else { "(none)" }
$serialShown = if ($payload.serialNumber) { $payload.serialNumber } else { "(none)" }
$monMsg = if ($monitors.Count -gt 0) { " and $($monitors.Count) monitor(s)" } else { "" }
Write-Log ("Sending {0} components{1} to {2}" -f $components.Count, $monMsg, $endpoint) "Cyan"
Write-Log ("  uuid={0}  serial={1}  hostname={2}  payload={3} bytes" -f $uuidShown, $serialShown, $payload.hostname, $json.Length)

try {
    $resp = Invoke-RestMethod -Uri $endpoint -Method Post -Headers $headers -Body $json
} catch {
    # A rejection lands here. Pull the HTTP status and the server's response BODY — for a 400 the
    # body carries the exact validation reason (which field, and why). Log all of it, and point at
    # the log so it can be read or attached when reporting the problem.
    $status = $null
    try { $status = [int]$_.Exception.Response.StatusCode } catch {}

    $serverMsg = $null
    $rawBody = Read-ErrorBody $_
    if ($rawBody) {
        try { $serverMsg = ($rawBody | ConvertFrom-Json).error.message } catch { $serverMsg = $rawBody }
    }

    Write-Log ""
    Write-Log "FAILED to send inventory." "Red"
    if ($status)    { Write-Log ("  HTTP status : {0}" -f $status) "Red" }
    Write-Log ("  Error       : {0}" -f $_.Exception.Message) "Red"
    if ($serverMsg) { Write-Log ("  Server says : {0}" -f $serverMsg) "Yellow" }
    if ($rawBody)   { Write-LogDetail "---------------- server response body ----------------"; Write-LogDetail $rawBody }
    Write-Log ""
    Write-Log ("A full log, including the exact payload that was rejected, was saved to:") "Cyan"
    Write-Log ("  {0}" -f $LogFile) "Cyan"
    exit 1
}

$outcome = $resp.data.outcome
Write-LogDetail "---------------- server response ----------------"
Write-LogDetail ($resp | ConvertTo-Json -Depth 6)
if ($outcome -eq "updated") {
    Write-Log ("OK - matched an existing asset ({0}); its details were updated." -f $resp.data.assetTag) "Green"

    # Monitors already in ITAM: say which asset each display is, so a steady state reads as
    # "tracked" rather than as silence.
    $known = @($resp.data.monitorsKnown)
    foreach ($k in $known) {
        $how = if ($k.newlyLinked) { "connected to this machine" } else { "already connected" }
        Write-Host ("  monitor {0} -> {1} ({2})" -f $k.label, $k.assetTag, $how) -ForegroundColor Green
    }

    # A monitor IS plugged in and detected, but isn't in ITAM. Say where it went and what to do,
    # instead of failing silently.
    $unmatched = @($resp.data.monitorsUnmatched)
    if ($unmatched.Count -gt 0) {
        Write-Host ""
        Write-Host "NOTE: $($unmatched.Count) connected monitor(s) aren't in ITAM yet, so they were sent to Discovered:" -ForegroundColor Yellow
        $anySerial = $false
        foreach ($u in $unmatched) {
            if ($u.serialNumber) {
                $anySerial = $true
                Write-Host ("  - {0} (serial {1})" -f $u.model, $u.serialNumber) -ForegroundColor Yellow
            } else {
                Write-Host ("  - {0} (no serial published)" -f $u.model) -ForegroundColor Yellow
            }
        }
        Write-Host "  Open Discovered in ITAM and add each one with your asset tag; it will be connected" -ForegroundColor Yellow
        Write-Host "  to this machine automatically." -ForegroundColor Yellow
        if ($anySerial) {
            Write-Host "  (For one that's ALREADY in ITAM: give that asset exactly the serial shown above and" -ForegroundColor Yellow
            Write-Host "   re-run this script to link it. Windows reports the display's EDID serial, which may" -ForegroundColor Yellow
            Write-Host "   differ from the number printed on the sticker.)" -ForegroundColor Yellow
        }
    }
} elseif ($outcome -eq "discovered") {
    $word = if ($resp.data.isNew) { "New machine" } else { "Machine" }
    Write-Log ("OK - {0} recorded under Discovered in ITAM. An admin can onboard it there with an asset tag." -f $word) "Green"
} else {
    Write-Log "OK - server responded (see log for details)." "Green"
}

Write-Log ""
Write-Log ("Log saved: {0}" -f $LogFile) "DarkGray"
