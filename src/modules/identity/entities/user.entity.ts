import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, minlength: 3, maxlength: 30 })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email: string;

  @Prop()
  phone: string;

  @Prop({ minlength: 5, select: false })
  password: string;

  @Prop()
  changedPasswordAt: Date;

  @Prop({ type: String, required: false })
  passwordResetCode?: string;

  @Prop({ type: Date, required: false })
  passwordResetCodeExpiresAt?: Date;

  @Prop({ type: Boolean, default: false })
  passwordResetCodeVerified?: boolean;

  @Prop({ select: false })
  lastResetCodeSentAt: Date;

  @Prop({ type: [Date], default: [], select: false })
  resetCodeRequests: Date[];

  @Prop({ default: true })
  active: boolean;

  @Prop({
    type: String,
    enum: ['super-admin', 'admin', 'employee', 'guest'],
    default: 'employee',
  })
  role: string;

  @Prop()
  position: string;

  @Prop({ unique: true })
  jobId: number;

  @Prop({ default: Date.now })
  hireDate: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company' })
  companyId: Types.ObjectId;

  @Prop({ select: false })
  refreshToken: string;

  @Prop({ select: false })
  refreshTokenExpires: Date;

  // Auto-increment handled by mongoose-sequence plugin
  // We'll implement this manually in the service/repository
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before save
UserSchema.pre<UserDocument>(
  'save',
  async function (this: UserDocument, next: (err?: any) => void) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 8);
    next();
  },
);

// Method to compare refresh token
UserSchema.methods.compareRefreshToken = async function (
  this: UserDocument,
  token: string,
): Promise<boolean> {
  if (!this.refreshToken) return false;
  return await bcrypt.compare(token, this.refreshToken);
};
