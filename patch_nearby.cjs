const fs = require('fs');
let code = fs.readFileSync('src/components/mobile/DiscoverTab.tsx', 'utf-8');

const oldNearbyProps = `export function NearbyPeopleView({ 
  onNavigateToTab,
  setActiveChat,
  onSendBackgroundWave,
  onDetailToggle
}: { 
  onNavigateToTab?: (tab: string) => void;
  setActiveChat?: (profile: any) => void;
  onSendBackgroundWave?: (profile: any) => void;
  onDetailToggle?: (isOpen: boolean) => void;
}) {`;

const newNearbyProps = `export function NearbyPeopleView({ 
  onNavigateToTab,
  setActiveChat,
  onSendBackgroundWave,
  onDetailToggle,
  profiles,
  likedProfiles,
  onLikeProfile
}: { 
  onNavigateToTab?: (tab: string) => void;
  setActiveChat?: (profile: any) => void;
  onSendBackgroundWave?: (profile: any) => void;
  onDetailToggle?: (isOpen: boolean) => void;
  profiles?: any[];
  likedProfiles?: number[];
  onLikeProfile?: (id: string | number) => void;
}) {`;

if (code.includes(oldNearbyProps)) {
    code = code.replace(oldNearbyProps, newNearbyProps);
    console.log("Updated NearbyPeopleView props");
} else {
    console.log("Could not find NearbyPeopleView props");
}

const oldNearbyUsage = `<NearbyPeopleView 
            onNavigateToTab={onNavigateToTab}
            setActiveChat={setActiveChat}
            onSendBackgroundWave={onSendBackgroundWave}
            onDetailToggle={onDetailToggle}
          />`;

const newNearbyUsage = `<NearbyPeopleView 
            onNavigateToTab={onNavigateToTab}
            setActiveChat={setActiveChat}
            onSendBackgroundWave={onSendBackgroundWave}
            onDetailToggle={onDetailToggle}
            profiles={profiles}
            likedProfiles={likedProfiles}
            onLikeProfile={onLikeProfile}
          />`;

if (code.includes(oldNearbyUsage)) {
    code = code.replace(oldNearbyUsage, newNearbyUsage);
    console.log("Updated NearbyPeopleView instantiation");
} else {
    console.log("Could not find NearbyPeopleView instantiation");
}

fs.writeFileSync('src/components/mobile/DiscoverTab.tsx', code);
