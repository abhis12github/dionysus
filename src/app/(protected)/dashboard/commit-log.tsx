'use client';

import useProject from '@/hooks/use-project';
import { cn } from '@/lib/utils';
import { api } from '@/trpc/react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import React from 'react'

const CommitLog = () => {
    const {projectId,project}=useProject();
    const {data:commits}=api.project.getCommits.useQuery({projectId});
    return (
        <>
            <ul className='space-y-8'>
                {commits?.map((commit,commmitIdx)=>{
                    return <li key={commit.id} className='relative flex  gap-x-4'>
                        <div className={cn(commmitIdx===commits.length-1?'h-6':'-bottom-6','absolute left-0 top-0 flex w-6 justify-center')}>
                            <div className='w-px translate-x-1 bg-gray-200 '></div>
                        </div>

                        <>
                            <img src={commit.commitAuthorAvatar} alt='commit author avatar' className='relative mt-4 size-8 flex-none rounded-full bg-gray-6'/>
                            <div className='flex-auto rounded-md bg-white p-3 ring-1 ring-inset ring-gray-200'>
                                <div className='flex justify-between gap-x-4'>
                                    <Link target='_blank' href={`${project?.githubUrl}/commit/${commit.commitHash}`}>
                                        <span className='font-medium text-gray-800'>
                                            {commit.commitAuthorName}
                                        </span>{""}

                                        <span className='inline-flex items-center'>
                                            committed
                                            <ExternalLink className='ml-1 size-4'></ExternalLink>
                                        </span>
                                    </Link>
                                </div>
                                <span className='font-semibold'>
                                    {commit.commitMessage}
                                </span>
                                <pre className='mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-500'>
                                    {commit.summary}
                                </pre>
                            </div>    
                        </>
                    </li>
                })}
            </ul>
        </>
    );
}

export default CommitLog;
