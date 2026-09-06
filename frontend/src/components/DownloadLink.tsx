import { mediaUrl } from '../utils/utils';

type Props = {
    path: string;
    title: string;
};

const DownloadLink = ({ path, title }: Props) => {
    const href = mediaUrl(path);

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
