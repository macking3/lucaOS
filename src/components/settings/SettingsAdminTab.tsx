import React from "react";
import AdminEnrollmentModal from "../AdminEnrollmentModal";
import { lucaService } from "../../services/lucaService";

interface SettingsAdminTabProps {
  setStatusMsg: (msg: string) => void;
  theme: {
    primary: string;
    hex: string;
  };
}

const SettingsAdminTab: React.FC<SettingsAdminTabProps> = ({
  setStatusMsg,
  theme,
}) => {
  return (
    <div className="h-full">
      <AdminEnrollmentModal
        theme={theme}
        onClose={() => {}} // No-op for embedded panel
        onEnrollSuccess={() => setStatusMsg("Admin Enrolled Successfully")}
        onVerify={(image) => lucaService.verifyIdentity(image)}
        onVerifyVoice={(audio) => lucaService.verifyVoice(audio)}
      />
    </div>
  );
};

export default SettingsAdminTab;
