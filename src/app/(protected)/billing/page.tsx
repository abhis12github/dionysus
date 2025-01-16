'use client';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { api } from '@/trpc/react';
import { Info } from 'lucide-react';
import React from 'react';

const BillingPage = () => {
    const { data: user } = api.project.getMyCredits.useQuery();
    const [creditsToBuy, setCreditsToBuy] = React.useState<number[]>([100]);
    const [isLoading, setIsLoading] = React.useState(false);
    const creditsToBuyAmount = creditsToBuy[0]!;
    const price = (creditsToBuyAmount / 50).toFixed(2);

    const handlePaypalCheckout = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credits: creditsToBuyAmount }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create order');
            }

            const approvalLink = data.links.find(
                (link: { rel: string; href: string }) => link.rel === "approve"
            );

            if (!approvalLink) {
                throw new Error('Approval URL not found');
            }

            window.location.href = approvalLink.href;
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h1 className='text-xl font-semibold'>Billing</h1>
            <div className="h-2"></div>
            <p className='text-sm text-gray-500'>
                You currently have {user?.credits} credits.
            </p>
            <div className="h-2"></div>
            <div className='bg-blue-50 px-4 py-2 rounded-md border-blue-200 text-blue-700'>
                <div className='flex items-center gap-2'>
                    <Info className='size-4' />
                    <p className='text-sm'>Each credit allows you to index 1 file in a repository.</p>
                </div>
                <p className='text-sm'>E.g. If your project has 100 files, you will need 100 credits to index it.</p>
            </div>

            <div className="h-4"></div>
            <Slider 
                defaultValue={[100]} 
                max={1000} 
                min={10} 
                step={10} 
                onValueChange={value => setCreditsToBuy(value)} 
                value={creditsToBuy} 
            />
            <div className="h-4"></div>
            <Button 
                onClick={handlePaypalCheckout}
                disabled={isLoading}
            >
                {isLoading ? 'Processing...' : `Buy ${creditsToBuyAmount} credits for $${price}`}
            </Button>
        </div>
    );
};

export default BillingPage;
