'use client';

import Script from 'next/script';
import { useEffect } from 'react';

export default function Clarity() {
    const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

    useEffect(() => {
        if (clarityId) {
            console.log('Clarity ID detected:', clarityId);
        } else {
            console.warn('Clarity ID is missing');
        }
    }, [clarityId]);

    if (!clarityId) {
        return null;
    }

    return (
        <Script
            id="microsoft-clarity"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
                __html: `
                (function(c,l,a,r,i,t,y){
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${clarityId}");
                `,
            }}
        />
    );
}
