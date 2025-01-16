'use client';
import useProject from '@/hooks/use-project';
import { useUser } from '@clerk/nextjs';
import { ExternalLink, Github } from 'lucide-react';
import Link from 'next/link';
import React from 'react'
import CommitLog from './commit-log';
import AskQuestionCrad from './ask-question-card';
import MeetingCard from './meeting-card';
import ArchiveButton from './archive-button';
const InviteButton=dynamic(()=>import('./invite-button'),{ssr:false});
import TeamMembers from './team-members';
import dynamic from 'next/dynamic';

const DashboardPage = () => {
    const {project}=useProject();
  return (
    <div>
      <div className='flex items-center justify-between flex-wrap gap-y-4'>
        <div className='w-fit rounded-md bg-primary px-2 py-2'>
          <div className='flex items-center'>
            <Github className='size-5 text-white'></Github>
            <div className='ml-2'>
              <p className='text-sm font-medium text-white'>
                This project is linked to {''}
                <Link href={project?.githubUrl??""} className='inline-flex items-center text-white/80 hover:underline'>
                  {project?.githubUrl}
                  <ExternalLink className='ml-1 size-4'></ExternalLink>
                </Link>
              </p>
            </div>
            </div>   
        </div>

        <div className='flex items-center gap-4'>
         <TeamMembers></TeamMembers>
          <InviteButton></InviteButton>
          <ArchiveButton></ArchiveButton>
        </div>
      </div>

      <div className='mt-4'>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-5'>
          <AskQuestionCrad></AskQuestionCrad>
          <MeetingCard></MeetingCard>
        </div>
      </div>

      <div className='mt-8'>
        <CommitLog></CommitLog>
      </div>
    </div>
  )
}

export default DashboardPage;
