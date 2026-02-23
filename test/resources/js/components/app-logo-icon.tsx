import type { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg
            {...props}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            aria-label="Parking logo"
        >
            {/* Fond carré arrondi */}
            <rect
                x="4"
                y="4"
                width="56"
                height="56"
                rx="12"
                ry="12"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
            />

            {/* Lettre P au centre */}
            <path
                d="
                    M24 44
                    V20
                    H34
                    C39 20 42 23 42 28
                    C42 33 39 36 34 36
                    H28
                    V44
                    Z
                    M28 24
                    V32
                    H34
                    C36.5 32 38 30.5 38 28
                    C38 25.5 36.5 24 34 24
                    Z
                "
                fill="currentColor"
            />

            {/* Petite place de parking stylisée en bas */}
            <rect
                x="18"
                y="48"
                width="28"
                height="4"
                rx="2"
                fill="currentColor"
                opacity="0.6"
            />
        </svg>
    );
}