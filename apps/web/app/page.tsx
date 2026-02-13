import HomePage from "@/templates/HomePage";
import { getCurrentUser } from "@/actions/auth.actions";
import { getDefaultInstance } from "@/actions/instances.actions";

const Home = async () => {
    const user = await getCurrentUser();

    if (!user) {
        return <HomePage instance={null} />;
    }

    const instance = await getDefaultInstance();
    return <HomePage instance={instance} />;
};

export default Home;
