import { useContext, useEffect, useState } from 'react';
import { StorageContext } from '../contexts/StorageContext';

type Profile = {
    id: number;
    username: string;
};

const ProfileSelector = () => {
    const { id, setID } = useContext(StorageContext);
    const [profiles, setProfiles] = useState<Profile[]>([]);

    const fetchProfiles = () => {
        fetch('/api/profiles')
            .then((res) => res.json())
            .then((data) => setProfiles(data))
            .catch(() => console.error('Failed to load profiles'));
    };

    useEffect(() => {
        fetchProfiles();
    }, [id]); // 👈 refetch when id changes (e.g. after new profile created)

    return (
        <div className="ml-auto">
            <select
                value={id || ''}
                onChange={(e) => {
                    const val = e.target.value;
                    setID(val === 'new' ? undefined : parseInt(val, 10));
                }}
                className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
            >
                <option value="" disabled>
                    Select a profile
                </option>
                {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.username}
                    </option>
                ))}
                <option value="new">+ New Profile</option>
            </select>
        </div>
    );
};

export default ProfileSelector;
