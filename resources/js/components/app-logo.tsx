export default function AppLogo() {
  return (
    <div className="
      flex w-full items-center px-2 py-2
      transition-all duration-200
      data-[state=collapsed]:justify-center
    ">

      <img
        src="/image/logo1.png"
        alt="ParkVision Pro Logo"
        className="
          h-10 w-10 object-contain shrink-0 transition-all duration-200
          data-[state=collapsed]:h-12
          data-[state=collapsed]:w-12
        "
      />

      <div className="
        ml-2 flex flex-col leading-none transition-all duration-200
        data-[state=collapsed]:hidden
      ">
        <span className="text-lg font-bold tracking-tight text-foreground">
          ParkVision
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          Smart Parking
        </span>
      </div>

    </div>
  )
}
