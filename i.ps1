#Requires -RunAsAdministrator

<#
.SYNOPSIS
    Automatically downloads and installs development tools
.DESCRIPTION
    Interactive script to install VS Code, extensions, and development tools
.EXAMPLE
    .\Install-VSCode.ps1
#>

param(
    [string]$DownloadPath = "$env:TEMP\VSCodeUserSetup.exe",
    [switch]$KeepInstaller,
    [switch]$Silent
)

# VS Code download URL
$VSCodeUrl = "https://vscode.download.prss.microsoft.com/dbazure/download/stable/dfaf44141ea9deb3b4096f7cd6d24e00c147a4b1/VSCodeUserSetup-x64-1.101.0.exe"

function Get-UserChoice {
    param([string]$Prompt, [string]$Default = "y")
    if ($Silent) { return $true }
    $response = Read-Host "$Prompt (y/N)"
    return ($response -eq 'y' -or $response -eq 'Y' -or ($response -eq '' -and $Default -eq 'y'))
}

function Update-PathPermanently {
    param([string]$NewPath)
    try {
        $currentPath = [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
        if ($currentPath -notlike "*$NewPath*") {
            $newPathValue = $currentPath + ";" + $NewPath
            [System.Environment]::SetEnvironmentVariable("PATH", $newPathValue, "Machine")
            Write-Host "Added to system PATH: $NewPath" -ForegroundColor Gray
        }
        # Refresh current session PATH
        $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
    } catch {
        Write-Host "Warning: Could not update system PATH for $NewPath" -ForegroundColor Yellow
    }
}

function Verify-Installation {
    param(
        [string]$Command,
        [string]$Name,
        [string]$ExpectedPath = $null
    )
    
    Start-Sleep -Seconds 2
    $cmd = Get-Command $Command -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host "[OK] $Name verified at: $($cmd.Source)" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[FAIL] $Name verification failed - command '$Command' not found" -ForegroundColor Red
        return $false
    }
}

function Test-WingetAvailable {
    $winget = Get-Command "winget" -ErrorAction SilentlyContinue
    return $winget -ne $null
}

function Install-WithChocolatey {
    param([string]$PackageName, [string]$DisplayName)
    
    $choco = Get-Command "choco" -ErrorAction SilentlyContinue
    if (-not $choco) {
        Write-Host "Warning: Chocolatey is not available for fallback installation of $DisplayName" -ForegroundColor Yellow
        return $false
    }
    
    try {
        Write-Host "Installing $DisplayName using Chocolatey..." -ForegroundColor Cyan
        $chocoProcess = Start-Process -FilePath "choco" -ArgumentList "install", $PackageName, "-y" -Wait -PassThru -NoNewWindow
        return $chocoProcess.ExitCode -eq 0
    } catch {
        Write-Host "Warning: Chocolatey installation of $DisplayName failed: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

Write-Host "Development Tools Installation Script" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

if (-not $Silent) {
    Write-Host "`nThis script can install the following tools:" -ForegroundColor Cyan
    Write-Host "- Visual Studio Code" -ForegroundColor White
    Write-Host "- Augment Code extension for VS Code" -ForegroundColor White
    Write-Host "- Windows Terminal" -ForegroundColor White
    Write-Host "- Chocolatey package manager" -ForegroundColor White
    Write-Host "- Git SCM" -ForegroundColor White
    Write-Host "- Node.js" -ForegroundColor White
    Write-Host "- pnpm package manager" -ForegroundColor White
    Write-Host ""
}

# Get user preferences
$installVSCode = Get-UserChoice "Install Visual Studio Code?"
$installAugment = Get-UserChoice "Install Augment Code extension for VS Code?"
$installTerminal = Get-UserChoice "Install Windows Terminal?"
$installChocolatey = Get-UserChoice "Install Chocolatey package manager?"
$installGit = Get-UserChoice "Install Git SCM?"
$installNodejs = Get-UserChoice "Install Node.js?"
$installPnpm = Get-UserChoice "Install pnpm package manager?"

Write-Host "`nStarting installation process..." -ForegroundColor Green

try {
    if ($installVSCode) {
        # Check if VS Code is already installed
        $vscodePath = Get-Command "code" -ErrorAction SilentlyContinue
        if ($vscodePath) {
            Write-Host "VS Code is already installed at: $($vscodePath.Source)" -ForegroundColor Yellow
            $reinstall = Get-UserChoice "Do you want to reinstall?"
            if (-not $reinstall) {
                $installVSCode = $false
                Write-Host "Skipping VS Code installation." -ForegroundColor Yellow
            }
        }

        if ($installVSCode) {
            # Download VS Code installer
            Write-Host "Downloading VS Code installer..." -ForegroundColor Cyan
            Write-Host "URL: $VSCodeUrl" -ForegroundColor Gray
            Write-Host "Destination: $DownloadPath" -ForegroundColor Gray
            
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile($VSCodeUrl, $DownloadPath)
            
            # Verify download
            if (-not (Test-Path $DownloadPath)) {
                throw "Download failed. Installer not found at $DownloadPath"
            }
            
            $fileSize = (Get-Item $DownloadPath).Length / 1MB
            Write-Host "Download completed successfully. File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Green

            # Install VS Code silently
            Write-Host "Installing VS Code..." -ForegroundColor Cyan
            $installArgs = @(
                "/VERYSILENT",
                "/NORESTART", 
                "/MERGETASKS=!runcode,addcontextmenufiles,addcontextmenufolders,associatewithfiles,addtopath"
            )
            
            $process = Start-Process -FilePath $DownloadPath -ArgumentList $installArgs -Wait -PassThru
            
            if ($process.ExitCode -eq 0) {
                Write-Host "VS Code installed successfully!" -ForegroundColor Green
                
                # Update PATH permanently for VS Code
                $vscodePath = "${env:ProgramFiles}\Microsoft VS Code\bin"
                if (Test-Path $vscodePath) {
                    Update-PathPermanently $vscodePath
                }
                
                # Verify installation
                if (Verify-Installation "code" "VS Code") {
                    $installVSCode = $true
                } else {
                    Write-Host "VS Code installation may have issues" -ForegroundColor Yellow
                }
            } else {
                throw "VS Code installation failed with exit code: $($process.ExitCode)"
            }
        }
    }

    # Install Augment Code extension
    if ($installAugment) {
        $codeAvailable = Get-Command "code" -ErrorAction SilentlyContinue
        if (-not $codeAvailable) {
            Write-Host "Warning: VS Code is not installed or not in PATH. Cannot install Augment Code extension." -ForegroundColor Yellow
            Write-Host "Please install VS Code first, then run: code --install-extension AugmentCode.augment" -ForegroundColor Yellow
        } else {
            Write-Host "Installing Augment Code extension..." -ForegroundColor Cyan
            try {
                $extensionProcess = Start-Process -FilePath "code" -ArgumentList "--install-extension", "AugmentCode.augment" -Wait -PassThru -NoNewWindow
                
                if ($extensionProcess.ExitCode -eq 0) {
                    Write-Host "Augment Code extension installed successfully!" -ForegroundColor Green
                    
                    # Verify extension installation
                    try {
                        $listProcess = Start-Process -FilePath "code" -ArgumentList "--list-extensions" -Wait -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\extensions.txt"
                        $extensions = Get-Content "$env:TEMP\extensions.txt" -ErrorAction SilentlyContinue
                        if ($extensions -contains "AugmentCode.augment") {
                            Write-Host "[OK] Augment Code extension verified" -ForegroundColor Green
                        } else {
                            Write-Host "[FAIL] Augment Code extension verification failed" -ForegroundColor Red
                        }
                        Remove-Item "$env:TEMP\extensions.txt" -Force -ErrorAction SilentlyContinue
                    } catch {
                        Write-Host "Could not verify Augment Code extension installation" -ForegroundColor Yellow
                    }
                } else {
                    Write-Host "Warning: Failed to install Augment Code extension (Exit code: $($extensionProcess.ExitCode))" -ForegroundColor Yellow
                    Write-Host "You can manually install it later from: https://www.augmentcode.com/" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "Warning: Could not install Augment Code extension automatically: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "You can manually install it later from: https://www.augmentcode.com/" -ForegroundColor Yellow
            }
        }
    }
    
    # Install Windows Terminal
    if ($installTerminal) {
        Write-Host "Installing Windows Terminal..." -ForegroundColor Cyan
        
        if (Test-WingetAvailable) {
            try {
                $terminalProcess = Start-Process -FilePath "winget" -ArgumentList "install", "--id=Microsoft.WindowsTerminal", "--source=msstore", "--accept-package-agreements", "--accept-source-agreements" -Wait -PassThru -NoNewWindow
                
                if ($terminalProcess.ExitCode -eq 0) {
                    Write-Host "Windows Terminal installed successfully!" -ForegroundColor Green
                    
                    # Verify Windows Terminal installation
                    $terminalPath = Get-ChildItem "${env:ProgramFiles}\WindowsApps" -Filter "*Microsoft.WindowsTerminal*" -Directory -ErrorAction SilentlyContinue | Select-Object -First 1
                    if ($terminalPath) {
                        Write-Host "[OK] Windows Terminal verified at: $($terminalPath.FullName)" -ForegroundColor Green
                    } else {
                        Write-Host "[FAIL] Windows Terminal verification failed" -ForegroundColor Red
                    }
                } else {
                    Write-Host "Warning: Failed to install Windows Terminal via winget (Exit code: $($terminalProcess.ExitCode))" -ForegroundColor Yellow
                    Write-Host "Trying Chocolatey as fallback..." -ForegroundColor Cyan
                    Install-WithChocolatey "microsoft-windows-terminal" "Windows Terminal"
                }
            } catch {
                Write-Host "Warning: Could not install Windows Terminal via winget: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "Trying Chocolatey as fallback..." -ForegroundColor Cyan
                Install-WithChocolatey "microsoft-windows-terminal" "Windows Terminal"
            }
        } else {
            Write-Host "winget not available, using Chocolatey..." -ForegroundColor Yellow
            if (-not (Install-WithChocolatey "microsoft-windows-terminal" "Windows Terminal")) {
                Write-Host "You can manually install it from: https://apps.microsoft.com/detail/9nblggh4nns1" -ForegroundColor Yellow
            }
        }
    }
    
    # Install Chocolatey
    if ($installChocolatey) {
        Write-Host "Installing Chocolatey package manager..." -ForegroundColor Cyan
        try {
            $chocoExists = Get-Command "choco" -ErrorAction SilentlyContinue
            if (-not $chocoExists) {
                $chocoInstallScript = Invoke-RestMethod -Uri "https://chocolatey.org/install.ps1"
                Invoke-Expression $chocoInstallScript
                
                # Refresh environment variables
                $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
                
                $chocoVerify = Get-Command "choco" -ErrorAction SilentlyContinue
                if ($chocoVerify) {
                    Write-Host "Chocolatey installed successfully!" -ForegroundColor Green
                    
                    # Update PATH permanently for Chocolatey
                    $chocoPath = "${env:ProgramData}\chocolatey\bin"
                    if (Test-Path $chocoPath) {
                        Update-PathPermanently $chocoPath
                    }
                    
                    # Verify Chocolatey installation
                    Verify-Installation "choco" "Chocolatey"
                } else {
                    Write-Host "Warning: Chocolatey installation could not be verified" -ForegroundColor Yellow
                }
            } else {
                Write-Host "Chocolatey is already installed" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "Warning: Could not install Chocolatey automatically: $($_.Exception.Message)" -ForegroundColor Yellow
            Write-Host "You can manually install it from: https://chocolatey.org/install" -ForegroundColor Yellow
        }
    }
    
    # Install Git SCM
    if ($installGit) {
        Write-Host "Installing Git SCM..." -ForegroundColor Cyan
        
        if (Test-WingetAvailable) {
            try {
                $gitProcess = Start-Process -FilePath "winget" -ArgumentList "install", "--id=Git.Git", "--accept-package-agreements", "--accept-source-agreements" -Wait -PassThru -NoNewWindow
                
                if ($gitProcess.ExitCode -eq 0) {
                    Write-Host "Git SCM installed successfully!" -ForegroundColor Green
                    
                    # Update PATH permanently for Git
                    $gitPath = "${env:ProgramFiles}\Git\cmd"
                    if (Test-Path $gitPath) {
                        Update-PathPermanently $gitPath
                    }
                    
                    # Verify Git installation
                    if (Verify-Installation "git" "Git SCM") {
                        # Also check git version
                        try {
                            $gitVersion = & git --version 2>$null
                            Write-Host "Git version: $gitVersion" -ForegroundColor Gray
                        } catch {
                            Write-Host "Could not get Git version" -ForegroundColor Yellow
                        }
                    }
                } else {
                    Write-Host "Warning: Failed to install Git SCM via winget (Exit code: $($gitProcess.ExitCode))" -ForegroundColor Yellow
                    Write-Host "Trying Chocolatey as fallback..." -ForegroundColor Cyan
                    if (Install-WithChocolatey "git" "Git SCM") {
                        $gitPath = "${env:ProgramFiles}\Git\cmd"
                        if (Test-Path $gitPath) {
                            Update-PathPermanently $gitPath
                        }
                        Verify-Installation "git" "Git SCM"
                    }
                }
            } catch {
                Write-Host "Warning: Could not install Git SCM via winget: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "Trying Chocolatey as fallback..." -ForegroundColor Cyan
                if (Install-WithChocolatey "git" "Git SCM") {
                    $gitPath = "${env:ProgramFiles}\Git\cmd"
                    if (Test-Path $gitPath) {
                        Update-PathPermanently $gitPath
                    }
                    Verify-Installation "git" "Git SCM"
                }
            }
        } else {
            Write-Host "winget not available, using Chocolatey..." -ForegroundColor Yellow
            if (Install-WithChocolatey "git" "Git SCM") {
                $gitPath = "${env:ProgramFiles}\Git\cmd"
                if (Test-Path $gitPath) {
                    Update-PathPermanently $gitPath
                }
                Verify-Installation "git" "Git SCM"
            } else {
                Write-Host "You can manually install it from: https://git-scm.com/" -ForegroundColor Yellow
            }
        }
    }
    
    # Install Node.js
    if ($installNodejs) {
        Write-Host "Installing Node.js..." -ForegroundColor Cyan
        
        if (Test-WingetAvailable) {
            try {
                $nodeProcess = Start-Process -FilePath "winget" -ArgumentList "install", "--id=OpenJS.NodeJS", "--accept-package-agreements", "--accept-source-agreements" -Wait -PassThru -NoNewWindow
                
                if ($nodeProcess.ExitCode -eq 0) {
                    Write-Host "Node.js installed successfully!" -ForegroundColor Green
                    
                    # Update PATH permanently for Node.js
                    $nodePath = "${env:ProgramFiles}\nodejs"
                    if (Test-Path $nodePath) {
                        Update-PathPermanently $nodePath
                    }
                    
                    # Verify Node.js installation
                    if (Verify-Installation "node" "Node.js") {
                        # Also verify npm and check versions
                        if (Verify-Installation "npm" "npm") {
                            try {
                                $nodeVersion = & node --version 2>$null
                                $npmVersion = & npm --version 2>$null
                                Write-Host "Node.js version: $nodeVersion" -ForegroundColor Gray
                                Write-Host "npm version: $npmVersion" -ForegroundColor Gray
                            } catch {
                                Write-Host "Could not get Node.js/npm versions" -ForegroundColor Yellow
                            }
                        }
                    }
                } else {
                    Write-Host "Warning: Failed to install Node.js via winget (Exit code: $($nodeProcess.ExitCode))" -ForegroundColor Yellow
                    Write-Host "Trying Chocolatey as fallback..." -ForegroundColor Cyan
                    if (Install-WithChocolatey "nodejs" "Node.js") {
                        $nodePath = "${env:ProgramFiles}\nodejs"
                        if (Test-Path $nodePath) {
                            Update-PathPermanently $nodePath
                        }
                        Verify-Installation "node" "Node.js"
                        Verify-Installation "npm" "npm"
                    }
                }
            } catch {
                Write-Host "Warning: Could not install Node.js via winget: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "Trying Chocolatey as fallback..." -ForegroundColor Cyan
                if (Install-WithChocolatey "nodejs" "Node.js") {
                    $nodePath = "${env:ProgramFiles}\nodejs"
                    if (Test-Path $nodePath) {
                        Update-PathPermanently $nodePath
                    }
                    Verify-Installation "node" "Node.js"
                    Verify-Installation "npm" "npm"
                }
            }
        } else {
            Write-Host "winget not available, using Chocolatey..." -ForegroundColor Yellow
            if (Install-WithChocolatey "nodejs" "Node.js") {
                $nodePath = "${env:ProgramFiles}\nodejs"
                if (Test-Path $nodePath) {
                    Update-PathPermanently $nodePath
                }
                Verify-Installation "node" "Node.js"
                Verify-Installation "npm" "npm"
            } else {
                Write-Host "You can manually install it from: https://nodejs.org/" -ForegroundColor Yellow
            }
        }
    }
    
    # Install pnpm
    if ($installPnpm) {
        $npmAvailable = Get-Command "npm" -ErrorAction SilentlyContinue
        if (-not $npmAvailable) {
            Write-Host "Warning: npm is not installed or not in PATH. Cannot install pnpm." -ForegroundColor Yellow
            Write-Host "Please install Node.js first, then run: npm install -g pnpm" -ForegroundColor Yellow
        } else {
            Write-Host "Installing pnpm package manager..." -ForegroundColor Cyan
            try {
                $pnpmProcess = Start-Process -FilePath "npm" -ArgumentList "install", "-g", "pnpm" -Wait -PassThru -NoNewWindow
                
                if ($pnpmProcess.ExitCode -eq 0) {
                    Write-Host "pnpm installed successfully!" -ForegroundColor Green
                    
                    # Verify pnpm installation
                    if (Verify-Installation "pnpm" "pnpm") {
                        try {
                            $pnpmVersion = & pnpm --version 2>$null
                            Write-Host "pnpm version: $pnpmVersion" -ForegroundColor Gray
                        } catch {
                            Write-Host "Could not get pnpm version" -ForegroundColor Yellow
                        }
                    }
                } else {
                    Write-Host "Warning: Failed to install pnpm (Exit code: $($pnpmProcess.ExitCode))" -ForegroundColor Yellow
                    Write-Host "You can manually install it by running: npm install -g pnpm" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "Warning: Could not install pnpm automatically: $($_.Exception.Message)" -ForegroundColor Yellow
                Write-Host "You can manually install it by running: npm install -g pnpm" -ForegroundColor Yellow
            }
        }
    }

} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up installer unless requested to keep it
    if ((Test-Path $DownloadPath) -and -not $KeepInstaller) {
        Write-Host "Cleaning up installer..." -ForegroundColor Gray
        Remove-Item $DownloadPath -Force
    }
}

Write-Host "`nInstallation process completed!" -ForegroundColor Green
Write-Host "===============================`n" -ForegroundColor Green

# Summary of installed tools with verification
if ($installVSCode) { 
    $verified = if (Get-Command "code" -ErrorAction SilentlyContinue) { "OK" } else { "FAIL" }
    Write-Host "[$verified] VS Code - Launch with 'code'" -ForegroundColor $(if ($verified -eq "OK") { "Green" } else { "Red" })
}
if ($installAugment) { Write-Host "[OK] Augment Code extension (see verification above)" -ForegroundColor Green }
if ($installTerminal) { Write-Host "[OK] Windows Terminal available from Start menu" -ForegroundColor Green }
if ($installChocolatey) { 
    $verified = if (Get-Command "choco" -ErrorAction SilentlyContinue) { "OK" } else { "FAIL" }
    Write-Host "[$verified] Chocolatey - Use with 'choco'" -ForegroundColor $(if ($verified -eq "OK") { "Green" } else { "Red" })
}
if ($installGit) { 
    $verified = if (Get-Command "git" -ErrorAction SilentlyContinue) { "OK" } else { "FAIL" }
    Write-Host "[$verified] Git SCM - Use with 'git'" -ForegroundColor $(if ($verified -eq "OK") { "Green" } else { "Red" })
}
if ($installNodejs) { 
    $verified = if (Get-Command "node" -ErrorAction SilentlyContinue) { "OK" } else { "FAIL" }
    Write-Host "[$verified] Node.js - Use with 'node' and 'npm'" -ForegroundColor $(if ($verified -eq "OK") { "Green" } else { "Red" })
}
if ($installPnpm) { 
    $verified = if (Get-Command "pnpm" -ErrorAction SilentlyContinue) { "OK" } else { "FAIL" }
    Write-Host "[$verified] pnpm - Use with 'pnpm'" -ForegroundColor $(if ($verified -eq "OK") { "Green" } else { "Red" })
}

Write-Host "`nPATH has been permanently updated. Restart your terminal for changes to take full effect." -ForegroundColor Cyan
