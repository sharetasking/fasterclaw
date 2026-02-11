"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, Transition } from "@headlessui/react";
import Image from "@/components/Image";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import Settings from "@/components/Settings";
import { getCurrentUser, logout } from "@/actions/auth.actions";
import { getSubscription } from "@/actions/billing.actions";
import { getVisibleSettings } from "@/constants/settings";
import type { User, Subscription } from "@fasterclaw/api-client";

interface ProfileProps {
  visible?: boolean;
}

const Profile = ({ visible = false }: ProfileProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [visibleSettings, setVisibleSettings] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);

      if (currentUser !== null) {
        const subscriptionResult = await getSubscription();
        if (subscriptionResult.success) {
          setSubscription(subscriptionResult.data.subscription);
        }
      }

      setLoading(false);
    };
    void fetchData();
  }, []);

  const handleLogout = () => {
    void logout().then(() => {
      router.push("/sign-in");
    });
  };

  if (loading) {
    return (
      <div className={visible ? "mb-6" : "mb-3 shadow-[0_1.25rem_1.5rem_0_rgba(0,0,0,0.5)]"}>
        <div className={visible ? "" : "p-2.5 bg-n-6 rounded-xl"}>
          <div
            className={`flex items-center ${visible ? "justify-center" : "px-2.5 py-2.5 pb-4.5"}`}
          >
            <div className="relative w-10 h-10 rounded-full bg-n-5 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  // Determine plan name and button text
  const planName =
    subscription?.plan !== undefined && subscription.plan !== ""
      ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
      : "Starter";
  const isPaid =
    subscription?.plan !== undefined && subscription.plan !== "" && subscription.plan !== "starter";
  const buttonText = isPaid ? "Manage Plan" : "Upgrade to Pro";

  return (
    <>
      <div className={visible ? "mb-6" : "mb-3 shadow-[0_1.25rem_1.5rem_0_rgba(0,0,0,0.5)]"}>
        <div className={visible ? "" : "p-2.5 bg-n-6 rounded-xl"}>
          <div
            className={`flex items-center ${visible ? "justify-center" : "px-2.5 py-2.5 pb-4.5"}`}
          >
            <Menu as="div" className="relative">
              <Menu.Button className="group relative w-10 h-10 rounded-full transition-shadow ui-open:shadow-[0_0_0_0.25rem_#0084FF]">
                <Image
                  className="rounded-full object-cover"
                  src="/images/avatar.jpg"
                  fill
                  alt="Avatar"
                />
                <div className="absolute -right-0.75 -bottom-0.75 w-4.5 h-4.5 bg-primary-2 rounded-full border-4 border-n-6"></div>
              </Menu.Button>
              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform scale-95 opacity-0"
                enterTo="transform scale-100 opacity-100"
                leave="transition duration-75 ease-out"
                leaveFrom="transform scale-100 opacity-100"
                leaveTo="transform scale-95 opacity-0"
              >
                <Menu.Items className="absolute bottom-full left-0 w-[16rem] mb-2 p-4 bg-n-1 border border-n-2 rounded-2xl shadow-[0px_48px_64px_-16px_rgba(0,0,0,0.25)] dark:bg-n-7 dark:border-n-5">
                  <div className="flex items-center mb-3">
                    <div className="relative w-12 h-12">
                      <Image
                        className="rounded-full object-cover"
                        src="/images/avatar.jpg"
                        fill
                        alt="Avatar"
                      />
                      <div className="absolute right-0 bottom-0 w-4 h-4 bg-primary-2 rounded-full border-4 border-n-1 dark:border-n-7"></div>
                    </div>
                    <div className="pl-3 overflow-hidden">
                      <div className="base2 font-semibold truncate">{user.name ?? "User"}</div>
                      <div className="caption1 text-n-4 truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="px-3 bg-n-2 rounded-xl dark:bg-n-6">
                    <Menu.Item>
                      <button
                        className="group flex items-center w-full h-11 base2 font-semibold transition-colors hover:text-primary-1"
                        onClick={() => {
                          setVisibleSettings(true);
                        }}
                      >
                        <Icon
                          className="mr-3 fill-n-4 transition-colors group-hover:fill-primary-1"
                          name="settings-fill"
                        />
                        Settings
                      </button>
                    </Menu.Item>
                    <Menu.Item>
                      <button
                        className="group flex items-center w-full h-11 base2 font-semibold transition-colors hover:text-primary-1"
                        onClick={handleLogout}
                      >
                        <Icon
                          className="mr-3 fill-n-4 transition-colors group-hover:fill-primary-1"
                          name="logout"
                        />
                        Log out
                      </button>
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
            {visible ? null : (
              <>
                <div className="ml-4 mr-4">
                  <div className="base2 font-semibold text-n-1">{user.name ?? "User"}</div>
                  <div className="caption1 font-semibold text-n-3/50">{user.email}</div>
                </div>
                <div className="shrink-0 ml-auto self-start px-3 bg-primary-2 rounded-lg caption1 font-bold text-n-7">
                  {planName}
                </div>
              </>
            )}
          </div>
          {visible ? null : (
            <Link className="btn-stroke-dark w-full mt-2" href="/pricing">
              {buttonText}
            </Link>
          )}
        </div>
      </div>
      <Modal
        className="md:!p-0"
        classWrap="max-w-[48rem] md:min-h-screen-ios md:rounded-none"
        classButtonClose="hidden md:block md:absolute md:top-5 md:right-5 dark:fill-n-4"
        classOverlay="md:bg-n-1"
        visible={visibleSettings}
        onClose={() => {
          setVisibleSettings(false);
        }}
      >
        <Settings items={getVisibleSettings()} />
      </Modal>
    </>
  );
};

export default Profile;
