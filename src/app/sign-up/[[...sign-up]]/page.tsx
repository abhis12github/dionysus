import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <div className='flex justify-center items-center min-h-screen m-4'>
      <SignUp />
    </div>
  
  );
}