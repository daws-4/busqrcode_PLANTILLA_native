import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import AntDesign from "@expo/vector-icons/AntDesign";

export const CircleInfoIcon = (props: any) => (
  <FontAwesome6 name="circle-info" size={24} color="black" {...props} />
);

export const HomeIcon = (props: any) => (
  <FontAwesome name="home" size={32} color="black" {...props} />
);

export const InfoIcon = (props: any) => (
  <FontAwesome name="info" size={32} color="black" {...props} />
);

export const ScannerIcon = (props: any) => (
  <MaterialIcons name="qr-code-scanner" size={32} color="black" {...props} />
)

export const LogoutIcon = (props: any) => (
  <MaterialIcons name="logout" size={32} color="black" {...props}/>
)

export const FlashOn = (props: any) => (
   <Ionicons name="flash" size={24} color="black" {...props}/>
)

export const FlashOff = (props: any) => (
  <Ionicons name="flash-off" size={24} color="black" {...props}/>
)

export const DeleteIcon = (props: any) => (
  <AntDesign name="delete" size={24} color="black" {...props}/>
);