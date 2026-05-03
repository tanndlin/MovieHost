import { useContext, useEffect } from 'react';
import useFetch from '../common/useFetch';
import { StorageContext } from '../contexts/StorageContext';

type Profile = {
    id: number;
    username: string;
};

const ProfileSelector = () => {
    const { id, setID } = useContext(StorageContext);

    const {
        loading,
        error,
        data: profiles,
        refetch
    } = useFetch<Profile[]>('/api/profiles');

    useEffect(() => {
        refetch();
    }, [id, refetch]);

    return (
        <div className="ml-auto">
            <select
                value={id || ''}
                onChange={(e) => {
                    const val = e.target.value;
                    setID(val === 'new' ? -1 : parseInt(val, 10));
                }}
                className="px-2 py-1 text-sm text-white bg-gray-700 rounded"
                disabled={loading || !!error}
            >
                {loading && <option>Loading...</option>}
                <option value="" disabled>
                    Select a profile
                </option>
                {profiles?.map((p) => (
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
