import { API_BASE_URL } from '../utils/env';

type Props = {
    path: string;
    title: string;
};

const DownloadLink = ({ path, title }: Props) => {
    const href = `${API_BASE_URL}/media/${path}`;

    return (
        <a
            href={href}
            download={title}
            className="text-sm text-white/50 hover:text-white transition-colors"
        >
            Download
        </a>
    );
};

export default DownloadLink;
