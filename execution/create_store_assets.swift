// Native vector rendering of the store icon, matching store/icon.svg.
import AppKit

let root = URL(fileURLWithPath: CommandLine.arguments[1])
for size in [80, 144] {
    let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    let context = NSGraphicsContext(bitmapImageRep: bitmap)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    let c = context.cgContext
    c.scaleBy(x: CGFloat(size)/144, y: CGFloat(size)/144)
    c.translateBy(x: 0, y: 144)
    c.scaleBy(x: 1, y: -1)
    func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat) -> CGColor {
        return CGColor(red: r/255, green: g/255, blue: b/255, alpha: 1)
    }
    func line(_ x: CGFloat, _ y: CGFloat, _ a: CGFloat, _ b: CGFloat) {
        c.move(to: CGPoint(x:x,y:y)); c.addLine(to:CGPoint(x:a,y:b)); c.strokePath()
    }
    c.setFillColor(color(6,27,43)); c.fill(CGRect(x:0,y:0,width:144,height:144))
    c.setFillColor(color(11,57,53)); c.fillEllipse(in:CGRect(x:24,y:24,width:96,height:96))
    c.setStrokeColor(color(77,119,120)); c.setLineWidth(3)
    c.strokeEllipse(in:CGRect(x:24,y:24,width:96,height:96))
    c.move(to:CGPoint(x:80,y:20)); c.addLine(to:CGPoint(x:39,y:124))
    c.addLine(to:CGPoint(x:74,y:124)); c.addLine(to:CGPoint(x:115,y:20)); c.closePath()
    c.setFillColor(color(19,88,102)); c.fillPath()
    c.setStrokeColor(color(0,255,255)); line(80,20,39,124); line(115,20,74,124)
    c.setStrokeColor(color(255,255,255)); c.setLineWidth(4); line(98,20,57,124)
    c.setFillColor(color(6,27,43)); c.fillEllipse(in:CGRect(x:55,y:73,width:20,height:20))
    c.setFillColor(color(255,170,0)); c.fillEllipse(in:CGRect(x:59,y:77,width:12,height:12))
    c.saveGState(); c.translateBy(x:88,y:45); c.rotate(by:0.375)
    c.setFillColor(color(255,255,255)); c.fill(CGRect(x:-4,y:-6,width:8,height:12))
    c.setFillColor(color(255,170,0))
    c.fill(CGRect(x:-14,y:-6,width:7,height:12)); c.fill(CGRect(x:7,y:-6,width:7,height:12))
    c.restoreGState()
    NSGraphicsContext.restoreGraphicsState()
    let name = size == 80 ? "icon-small.png" : "icon-large.png"
    try bitmap.representation(using:.png, properties:[:])!.write(to:root.appendingPathComponent(name))
    print("Rendered \(name) at \(size)x\(size)")
}
