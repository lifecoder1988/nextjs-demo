import Image from "next/image";
import { SmoothOutputDemo } from "./components/SmoothOutput";

export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <header className="flex flex-col items-center mb-8">
        <Image
          className="dark:invert mb-4"
          src="https://nextjs.org/icons/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <h1 className="text-3xl font-bold text-center mb-2">Next.js 平滑输出组件演示</h1>
        <p className="text-gray-600 text-center">一个实现逐字符平滑输出效果的React组件</p>
      </header>
      
      <main>
        <SmoothOutputDemo />
      </main>


    </div>
  );
}
