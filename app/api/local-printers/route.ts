import { NextRequest, NextResponse } from 'next/server'

interface LocalPrinter {
  name: string
  displayName: string
  description?: string
  status: string
  isDefault: boolean
  attributes?: string[]
}

export async function GET() {
  try {
    // Import printer detection library dynamically for server-side only
    const { execSync } = await import('child_process')
    
    let printers: LocalPrinter[] = []
    
    // Windows printer detection using PowerShell
    if (process.platform === 'win32') {
      try {
        const command = `powershell -Command "Get-Printer | Select-Object Name, DriverName, PrinterStatus, Shared | ConvertTo-Json"`
        const output = execSync(command, { encoding: 'utf8', timeout: 10000 })
        
        const windowsPrinters = JSON.parse(output)
        const printersArray = Array.isArray(windowsPrinters) ? windowsPrinters : [windowsPrinters]
        
        printers = printersArray.map((printer: any) => ({
          name: printer.Name,
          displayName: printer.Name,
          description: printer.DriverName || 'Unknown Driver',
          status: printer.PrinterStatus === 0 ? 'Ready' : 'Not Ready',
          isDefault: false, // We'll detect default separately
          attributes: printer.Shared ? ['Shared'] : []
        }))
        
        // Get default printer
        try {
          const defaultCommand = `powershell -Command "(Get-WmiObject -Query 'SELECT * FROM Win32_Printer WHERE Default = True').Name"`
          const defaultOutput = execSync(defaultCommand, { encoding: 'utf8', timeout: 5000 })
          const defaultPrinterName = defaultOutput.trim()
          
          printers = printers.map(printer => ({
            ...printer,
            isDefault: printer.name === defaultPrinterName
          }))
        } catch (defaultError) {
          console.warn('Could not detect default printer:', defaultError)
        }
        
      } catch (error) {
        console.error('Windows printer detection failed:', error)
        
        // Fallback: Try using wmic command
        try {
          const wmicCommand = `wmic printer get Name,DriverName,PrinterStatus,Default /format:csv`
          const wmicOutput = execSync(wmicCommand, { encoding: 'utf8', timeout: 10000 })
          
          const lines = wmicOutput.split('\n').filter(line => line.trim() && !line.startsWith('Node'))
          printers = lines.map(line => {
            const parts = line.split(',')
            if (parts.length >= 4) {
              return {
                name: parts[3]?.trim() || 'Unknown',
                displayName: parts[3]?.trim() || 'Unknown',
                description: parts[2]?.trim() || 'Unknown Driver',
                status: parts[4] === 'TRUE' ? 'Ready' : 'Not Ready',
                isDefault: parts[1] === 'TRUE',
                attributes: []
              }
            }
            return null
          }).filter(Boolean) as LocalPrinter[]
          
        } catch (wmicError) {
          console.error('WMIC printer detection also failed:', wmicError)
        }
      }
    }
    
    // macOS printer detection using lpstat
    else if (process.platform === 'darwin') {
      try {
        const command = `lpstat -p -d`
        const output = execSync(command, { encoding: 'utf8', timeout: 10000 })
        
        const lines = output.split('\n')
        const printerLines = lines.filter(line => line.startsWith('printer '))
        const defaultLine = lines.find(line => line.startsWith('system default destination:'))
        const defaultPrinter = defaultLine ? defaultLine.split(':')[1]?.trim() : null
        
        printers = printerLines.map(line => {
          const match = line.match(/printer (\S+) (.+)/)
          if (match) {
            const name = match[1]
            const status = match[2]
            return {
              name,
              displayName: name,
              description: 'macOS Printer',
              status: status.includes('idle') ? 'Ready' : 'Not Ready',
              isDefault: name === defaultPrinter,
              attributes: []
            }
          }
          return null
        }).filter(Boolean) as LocalPrinter[]
        
      } catch (error) {
        console.error('macOS printer detection failed:', error)
      }
    }
    
    // Linux printer detection using lpstat
    else if (process.platform === 'linux') {
      try {
        const command = `lpstat -p -d`
        const output = execSync(command, { encoding: 'utf8', timeout: 10000 })
        
        const lines = output.split('\n')
        const printerLines = lines.filter(line => line.startsWith('printer '))
        const defaultLine = lines.find(line => line.startsWith('system default destination:'))
        const defaultPrinter = defaultLine ? defaultLine.split(':')[1]?.trim() : null
        
        printers = printerLines.map(line => {
          const match = line.match(/printer (\S+) (.+)/)
          if (match) {
            const name = match[1]
            const status = match[2]
            return {
              name,
              displayName: name,
              description: 'Linux Printer',
              status: status.includes('idle') ? 'Ready' : 'Not Ready',
              isDefault: name === defaultPrinter,
              attributes: []
            }
          }
          return null
        }).filter(Boolean) as LocalPrinter[]
        
      } catch (error) {
        console.error('Linux printer detection failed:', error)
      }
    }
    
    return NextResponse.json({
      success: true,
      printers,
      platform: process.platform,
      count: printers.length
    })
    
  } catch (error) {
    console.error('Error detecting local printers:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to detect local printers',
        platform: process.platform,
        printers: []
      },
      { status: 500 }
    )
  }
}