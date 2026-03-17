type Props = {
    id?: number;
    usage: number;
};

const CPU = (props: Props) => {
    const { id, usage } = props;

    return (
        <li className="relative flex w-full h-full p-4 rounded-md bg-secondary">
            <p className="m-auto">{usage.toFixed(2)}%</p>

            {id !== undefined && (
                <span className="absolute text-xs top-1 left-1">CPU {id}</span>
            )}

            <div
                className="absolute bottom-0 left-0 w-full bg-accent rounded-b-md"
                style={{ height: `${usage}%`, opacity: 0.5 }}
            ></div>
        </li>
    );
};

export default CPU;
