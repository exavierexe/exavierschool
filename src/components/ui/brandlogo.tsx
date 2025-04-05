import Image from "next/image"

export function BrandLogo() {
    return (
        
        <span className="flex items-center gap-2 font-semibold flex-shrink-0 text-lg">
            <Image alt="" src="/favicon.ico" width="100" height="100" className="size-12 ml-5"/>
            
            <span>Exavier&apos;s School</span>
        </span>
        
    )
}