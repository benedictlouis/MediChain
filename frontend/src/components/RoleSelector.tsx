
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Users, Heart } from "lucide-react";

type UserRole = 'admin' | 'hospital' | 'patient' | 'insurance';

interface RoleSelectorProps {
  onRoleSelect: (role: UserRole) => void;
}

const RoleSelector = ({ onRoleSelect }: RoleSelectorProps) => {
  const roles = [
    {
      id: 'admin' as UserRole,
      title: 'Admin',
      description: 'System administrator with full access',
      icon: Shield,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      features: ['Add hospitals', 'Add insurance companies', 'System management']
    },
    {
      id: 'hospital' as UserRole,
      title: 'Hospital',
      description: 'Healthcare provider access',
      icon: Building2,
      color: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-50 hover:bg-emerald-100',
      features: ['Submit medical records', 'Manage patients', 'View patient data']
    },
    {
      id: 'patient' as UserRole,
      title: 'Patient',
      description: 'Patient portal access',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      features: ['View medical records', 'Submit claims', 'Track claim status']
    },
    {
      id: 'insurance' as UserRole,
      title: 'Insurance',
      description: 'Insurance company access',
      icon: Heart,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      features: ['Review claims', 'Approve/reject claims', 'Validate medical data']
    }
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {roles.map((role) => {
        const IconComponent = role.icon;
        return (
          <Card 
            key={role.id} 
            className={`group cursor-pointer transition-all duration-300 hover:shadow-lg border-2 hover:border-opacity-50 ${role.bgColor}`}
            onClick={() => onRoleSelect(role.id)}
          >
            <CardHeader className="text-center space-y-4">
              <div className={`w-16 h-16 bg-gradient-to-r ${role.color} rounded-xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                <IconComponent className="w-8 h-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl mb-2">{role.title}</CardTitle>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="text-sm text-gray-600 space-y-2">
                {role.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3"></div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button 
                className={`w-full bg-gradient-to-r ${role.color} hover:opacity-90 text-white`}
              >
                Access {role.title} Dashboard
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default RoleSelector;
