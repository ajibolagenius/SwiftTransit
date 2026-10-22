export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          created_at: string;
          id: string;
          is_default: boolean;
          label: string;
          lat: number;
          line: string;
          lng: number;
          owner_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label: string;
          lat: number;
          line: string;
          lng: number;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_default?: boolean;
          label?: string;
          lat?: number;
          line?: string;
          lng?: number;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'addresses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'addresses_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      courier_applications: {
        Row: {
          approved_at: string | null;
          courier_id: string;
          id: string;
          licence_number: string;
          licence_photo_path: string;
          rejected_at: string | null;
          status: Database['public']['Enums']['application_status'];
          submitted_at: string;
          updated_at: string;
          vehicle_number: string;
          vehicle_type: Database['public']['Enums']['vehicle_type'];
        };
        Insert: {
          approved_at?: string | null;
          courier_id: string;
          id?: string;
          licence_number: string;
          licence_photo_path: string;
          rejected_at?: string | null;
          status?: Database['public']['Enums']['application_status'];
          submitted_at?: string;
          updated_at?: string;
          vehicle_number: string;
          vehicle_type: Database['public']['Enums']['vehicle_type'];
        };
        Update: {
          approved_at?: string | null;
          courier_id?: string;
          id?: string;
          licence_number?: string;
          licence_photo_path?: string;
          rejected_at?: string | null;
          status?: Database['public']['Enums']['application_status'];
          submitted_at?: string;
          updated_at?: string;
          vehicle_number?: string;
          vehicle_type?: Database['public']['Enums']['vehicle_type'];
        };
        Relationships: [
          {
            foreignKeyName: 'courier_applications_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'courier_applications_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      couriers_status: {
        Row: {
          courier_id: string;
          current_order_id: string | null;
          is_online: boolean;
          last_lat: number | null;
          last_lng: number | null;
          last_seen_at: string | null;
          updated_at: string;
        };
        Insert: {
          courier_id: string;
          current_order_id?: string | null;
          is_online?: boolean;
          last_lat?: number | null;
          last_lng?: number | null;
          last_seen_at?: string | null;
          updated_at?: string;
        };
        Update: {
          courier_id?: string;
          current_order_id?: string | null;
          is_online?: boolean;
          last_lat?: number | null;
          last_lng?: number | null;
          last_seen_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'couriers_status_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'couriers_status_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: true;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'couriers_status_current_order_id_fkey';
            columns: ['current_order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          order_id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          order_id: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          order_id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      order_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          id: string;
          order_id: string;
          status: Database['public']['Enums']['order_status'];
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          order_id: string;
          status: Database['public']['Enums']['order_status'];
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          order_id?: string;
          status?: Database['public']['Enums']['order_status'];
        };
        Relationships: [
          {
            foreignKeyName: 'order_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_events_actor_id_fkey';
            columns: ['actor_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'order_events_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
        ];
      };
      orders: {
        Row: {
          base_kobo: number;
          courier_id: string | null;
          created_at: string;
          customer_id: string;
          distance_kobo: number;
          dropoff_lat: number;
          dropoff_line: string;
          dropoff_lng: number;
          handling_flags: Database['public']['Enums']['handling_flag'][];
          handling_kobo: number;
          id: string;
          idempotency_key: string | null;
          instructions: string;
          package_photo_path: string | null;
          package_size: Database['public']['Enums']['package_size'];
          payment_method: Database['public']['Enums']['payment_method'] | null;
          payment_reference: string | null;
          pickup_lat: number;
          pickup_line: string;
          pickup_lng: number;
          receiver_name: string;
          receiver_phone: string;
          scheduled_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
          weight_kg: number;
        };
        Insert: {
          base_kobo: number;
          courier_id?: string | null;
          created_at?: string;
          customer_id: string;
          distance_kobo: number;
          dropoff_lat: number;
          dropoff_line: string;
          dropoff_lng: number;
          handling_flags?: Database['public']['Enums']['handling_flag'][];
          handling_kobo: number;
          id?: string;
          idempotency_key?: string | null;
          instructions?: string;
          package_photo_path?: string | null;
          package_size: Database['public']['Enums']['package_size'];
          payment_method?: Database['public']['Enums']['payment_method'] | null;
          payment_reference?: string | null;
          pickup_lat: number;
          pickup_line: string;
          pickup_lng: number;
          receiver_name: string;
          receiver_phone: string;
          scheduled_at?: string | null;
          status?: Database['public']['Enums']['order_status'];
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
          weight_kg: number;
        };
        Update: {
          base_kobo?: number;
          courier_id?: string | null;
          created_at?: string;
          customer_id?: string;
          distance_kobo?: number;
          dropoff_lat?: number;
          dropoff_line?: string;
          dropoff_lng?: number;
          handling_flags?: Database['public']['Enums']['handling_flag'][];
          handling_kobo?: number;
          id?: string;
          idempotency_key?: string | null;
          instructions?: string;
          package_photo_path?: string | null;
          package_size?: Database['public']['Enums']['package_size'];
          payment_method?: Database['public']['Enums']['payment_method'] | null;
          payment_reference?: string | null;
          pickup_lat?: number;
          pickup_line?: string;
          pickup_lng?: number;
          receiver_name?: string;
          receiver_phone?: string;
          scheduled_at?: string | null;
          status?: Database['public']['Enums']['order_status'];
          total_kobo?: number;
          tracking_code?: string;
          type?: Database['public']['Enums']['order_type'];
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_courier_id_fkey';
            columns: ['courier_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      pricing_rules: {
        Row: {
          base_kobo: number;
          fragile_kobo: number;
          handle_with_care_kobo: number;
          keep_upright_kobo: number;
          kobo_per_km: number;
          package_size: Database['public']['Enums']['package_size'];
          perishable_kobo: number;
        };
        Insert: {
          base_kobo: number;
          fragile_kobo?: number;
          handle_with_care_kobo?: number;
          keep_upright_kobo?: number;
          kobo_per_km: number;
          package_size: Database['public']['Enums']['package_size'];
          perishable_kobo?: number;
        };
        Update: {
          base_kobo?: number;
          fragile_kobo?: number;
          handle_with_care_kobo?: number;
          keep_upright_kobo?: number;
          kobo_per_km?: number;
          package_size?: Database['public']['Enums']['package_size'];
          perishable_kobo?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          is_demo: boolean;
          last_name: string;
          locale: string;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          email?: string | null;
          first_name: string;
          id: string;
          is_demo?: boolean;
          last_name: string;
          locale?: string;
          phone?: string | null;
          role: Database['public']['Enums']['user_role'];
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          is_demo?: boolean;
          last_name?: string;
          locale?: string;
          phone?: string | null;
          role?: Database['public']['Enums']['user_role'];
        };
        Relationships: [];
      };
      wallet_transactions: {
        Row: {
          amount_kobo: number;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['wallet_tx_kind'];
          order_id: string | null;
          owner_id: string;
        };
        Insert: {
          amount_kobo: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          kind: Database['public']['Enums']['wallet_tx_kind'];
          order_id?: string | null;
          owner_id: string;
        };
        Update: {
          amount_kobo?: number;
          created_at?: string;
          id?: string;
          idempotency_key?: string | null;
          kind?: Database['public']['Enums']['wallet_tx_kind'];
          order_id?: string | null;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallet_transactions_order_id_fkey';
            columns: ['order_id'];
            isOneToOne: false;
            referencedRelation: 'orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'wallet_transactions_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'public_profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: {
          avatar_path: string | null;
          first_name: string | null;
          id: string | null;
          last_name: string | null;
        };
        Insert: {
          avatar_path?: string | null;
          first_name?: string | null;
          id?: string | null;
          last_name?: string | null;
        };
        Update: {
          avatar_path?: string | null;
          first_name?: string | null;
          id?: string | null;
          last_name?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      _generate_tracking_code: { Args: never; Returns: string };
      _is_privileged: { Args: never; Returns: boolean };
      _set_tx_key: { Args: { '': string }; Returns: undefined };
      _tracking_letter: { Args: never; Returns: string };
      _tx_key: { Args: { '': string }; Returns: string };
      assign_order: {
        Args: { order_id: string };
        Returns: {
          base_kobo: number;
          courier_id: string | null;
          created_at: string;
          customer_id: string;
          distance_kobo: number;
          dropoff_lat: number;
          dropoff_line: string;
          dropoff_lng: number;
          handling_flags: Database['public']['Enums']['handling_flag'][];
          handling_kobo: number;
          id: string;
          idempotency_key: string | null;
          instructions: string;
          package_photo_path: string | null;
          package_size: Database['public']['Enums']['package_size'];
          payment_method: Database['public']['Enums']['payment_method'] | null;
          payment_reference: string | null;
          pickup_lat: number;
          pickup_line: string;
          pickup_lng: number;
          receiver_name: string;
          receiver_phone: string;
          scheduled_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
          weight_kg: number;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      change_order_status: {
        Args: {
          new_status: Database['public']['Enums']['order_status'];
          order_id: string;
        };
        Returns: {
          base_kobo: number;
          courier_id: string | null;
          created_at: string;
          customer_id: string;
          distance_kobo: number;
          dropoff_lat: number;
          dropoff_line: string;
          dropoff_lng: number;
          handling_flags: Database['public']['Enums']['handling_flag'][];
          handling_kobo: number;
          id: string;
          idempotency_key: string | null;
          instructions: string;
          package_photo_path: string | null;
          package_size: Database['public']['Enums']['package_size'];
          payment_method: Database['public']['Enums']['payment_method'] | null;
          payment_reference: string | null;
          pickup_lat: number;
          pickup_line: string;
          pickup_lng: number;
          receiver_name: string;
          receiver_phone: string;
          scheduled_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
          weight_kg: number;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      complete_registration: {
        Args: {
          first_name: string;
          last_name: string;
          role: Database['public']['Enums']['user_role'];
        };
        Returns: {
          avatar_path: string | null;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          is_demo: boolean;
          last_name: string;
          locale: string;
          phone: string | null;
          role: Database['public']['Enums']['user_role'];
        };
        SetofOptions: {
          from: '*';
          to: 'profiles';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      courier_vehicle: {
        Args: { order_id: string };
        Returns: {
          vehicle_number: string;
          vehicle_type: Database['public']['Enums']['vehicle_type'];
        }[];
      };
      create_order: {
        Args: { draft: Json; idempotency_key: string };
        Returns: {
          base_kobo: number;
          courier_id: string | null;
          created_at: string;
          customer_id: string;
          distance_kobo: number;
          dropoff_lat: number;
          dropoff_line: string;
          dropoff_lng: number;
          handling_flags: Database['public']['Enums']['handling_flag'][];
          handling_kobo: number;
          id: string;
          idempotency_key: string | null;
          instructions: string;
          package_photo_path: string | null;
          package_size: Database['public']['Enums']['package_size'];
          payment_method: Database['public']['Enums']['payment_method'] | null;
          payment_reference: string | null;
          pickup_lat: number;
          pickup_line: string;
          pickup_lng: number;
          receiver_name: string;
          receiver_phone: string;
          scheduled_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
          weight_kg: number;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      expire_pending_orders: { Args: never; Returns: number };
      is_order_participant: { Args: { order_id: string }; Returns: boolean };
      nearby_orders: {
        Args: { radius_km?: number };
        Returns: {
          distance_km: number;
          id: string;
          package_size: Database['public']['Enums']['package_size'];
          pickup_lat: number;
          pickup_lng: number;
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
        }[];
      };
      pay_order: {
        Args: {
          idempotency_key: string;
          order_id: string;
          payment_reference: string;
        };
        Returns: {
          base_kobo: number;
          courier_id: string | null;
          created_at: string;
          customer_id: string;
          distance_kobo: number;
          dropoff_lat: number;
          dropoff_line: string;
          dropoff_lng: number;
          handling_flags: Database['public']['Enums']['handling_flag'][];
          handling_kobo: number;
          id: string;
          idempotency_key: string | null;
          instructions: string;
          package_photo_path: string | null;
          package_size: Database['public']['Enums']['package_size'];
          payment_method: Database['public']['Enums']['payment_method'] | null;
          payment_reference: string | null;
          pickup_lat: number;
          pickup_line: string;
          pickup_lng: number;
          receiver_name: string;
          receiver_phone: string;
          scheduled_at: string | null;
          status: Database['public']['Enums']['order_status'];
          total_kobo: number;
          tracking_code: string;
          type: Database['public']['Enums']['order_type'];
          weight_kg: number;
        };
        SetofOptions: {
          from: '*';
          to: 'orders';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      quote_price: {
        Args: {
          dropoff_lat: number;
          dropoff_lng: number;
          flags: Database['public']['Enums']['handling_flag'][];
          pickup_lat: number;
          pickup_lng: number;
          size: Database['public']['Enums']['package_size'];
        };
        Returns: Json;
      };
      record_wallet_tx: {
        Args: {
          amount_kobo: number;
          idempotency_key: string;
          kind: Database['public']['Enums']['wallet_tx_kind'];
          order_id: string;
          owner_id: string;
          use_tx_key?: boolean;
        };
        Returns: {
          amount_kobo: number;
          created_at: string;
          id: string;
          idempotency_key: string | null;
          kind: Database['public']['Enums']['wallet_tx_kind'];
          order_id: string | null;
          owner_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'wallet_transactions';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      route_km: {
        Args: {
          dropoff_lat: number;
          dropoff_lng: number;
          pickup_lat: number;
          pickup_lng: number;
        };
        Returns: number;
      };
      set_online: { Args: { online: boolean }; Returns: undefined };
      update_courier_location: {
        Args: { lat: number; lng: number };
        Returns: undefined;
      };
      wallet_balance: { Args: never; Returns: number };
    };
    Enums: {
      application_status: 'pending' | 'approved' | 'rejected';
      handling_flag: 'fragile' | 'perishable' | 'handle_with_care' | 'keep_upright';
      order_status:
        | 'pending_payment'
        | 'searching'
        | 'assigned'
        | 'at_pickup'
        | 'picked_up'
        | 'at_dropoff'
        | 'delivered'
        | 'cancelled'
        | 'failed';
      order_type: 'document' | 'parcel' | 'food' | 'groceries';
      package_size: 'small' | 'medium' | 'large';
      payment_method: 'card' | 'wallet';
      user_role: 'customer' | 'courier';
      vehicle_type: 'bike' | 'car' | 'van';
      wallet_tx_kind: 'booking' | 'topup' | 'payout' | 'refund';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_status: ['pending', 'approved', 'rejected'],
      handling_flag: ['fragile', 'perishable', 'handle_with_care', 'keep_upright'],
      order_status: [
        'pending_payment',
        'searching',
        'assigned',
        'at_pickup',
        'picked_up',
        'at_dropoff',
        'delivered',
        'cancelled',
        'failed',
      ],
      order_type: ['document', 'parcel', 'food', 'groceries'],
      package_size: ['small', 'medium', 'large'],
      payment_method: ['card', 'wallet'],
      user_role: ['customer', 'courier'],
      vehicle_type: ['bike', 'car', 'van'],
      wallet_tx_kind: ['booking', 'topup', 'payout', 'refund'],
    },
  },
} as const;
