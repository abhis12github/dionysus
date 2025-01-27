"use client"

import { LucideGithub } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  function handleSignIn() {
    router.push("/dashboard");
  }
  return (
    <div className="min-h-screen flex flex-col bg-white items-center w-full">
      <div className="p-4 border-b-[0.5px] border-black/10 flex justify-between items-center w-full m-0 sticky bg-white/70">
        <div className="flex gap-2">
          <span><LucideGithub></LucideGithub></span>
          <p className="text-blue-600 font-semibold">GitBuddy</p>
        </div>

        <button className="py-2 px-4 bg-blue-600 text-white rounded-sm text-sm  hover:bg-white hover:outline-blue-600 hover:outline hover:outline-1 hover:text-blue-600 smooth shadow-sm font-medium hidden" onClick={handleSignIn}>SignIn</button>
      </div>

      <div className="flex justify-center items-center mt-6 space-y-2 flex-col">

        <div className="flex flex-col items-center justfiy-center h-full w-[80%] md:w-[50%] lg:w-[50%] text-center mt-1 p-4">
          <h1 className="text-black font-semibold text-5xl leading-tight">  Unlock the Secrets of Your <span className="text-blue-600">Codebase</span> Instantly.</h1>
          <p className="text-black/60 font-normal text-md mt-3">Load any repository, ask questions, and get insights instantly.</p>
        </div>

        <div className="flex ">
          <button className="bg-blue-600 p-2 rounded-lg text-white  hover:bg-white hover:outline-blue-600 hover:outline hover:outline-1 hover:text-blue-600" onClick={handleSignIn}><span>Get Started</span></button>
        </div>

      </div>
      <div className="w-[70%] h-full p-4 border border-white/10 mt-12 m-4 shadow-md shadow-gray-600 rounded-sm">
        <img src="/home.png"></img>

      </div>

    </div>

  );
}
