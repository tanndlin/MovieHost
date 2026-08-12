import { CogIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { StorageContext } from '../contexts/StorageContext';
import ProfileSelector from './ProfileSelector';

const Header = () => {
    const { profile } = useContext(StorageContext);

    return (
        <header className="sticky top-0 z-50 flex justify-between gap-4 px-6 py-4 border-b bg-black/70 backdrop-blur-xl border-white/10">
            <Link
                to="/"
                className="flex items-center gap-2.5 transition-opacity hover:opacity-75"
            >
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-blue-400 shrink-0"
                >
                    <path
                        d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M4 8h8a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <span className="text-lg font-bold tracking-tight text-white">
                    MovieHost
                </span>
            </Link>

            <span className="flex items-center gap-4">
                <Link
                    to="/remote"
                    className="transition-opacity hover:opacity-75"
                >
                    <DevicePhoneMobileIcon className="w-5 h-5 text-blue-400 shrink-0" />
                </Link>
                {profile && (
                    <Link
                        to="/settings"
                        className="ml-auto transition-opacity hover:opacity-75"
                    >
                        <CogIcon className="w-5 h-5 text-gray-400" />
                    </Link>
                )}
                <ProfileSelector />
            </span>
        </header>
    );
};

export default Header;
