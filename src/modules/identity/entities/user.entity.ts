import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, minlength: 3, maxlength: 30 })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  @Prop()
  phone!: string;

  @Prop({ minlength: 5, select: false })
  password!: string;

  @Prop()
  changedPasswordAt!: Date;

  @Prop({ type: String, required: false })
  passwordResetCode?: string;

  @Prop({ type: Date, required: false })
  passwordResetCodeExpiresAt?: Date;

  @Prop({ type: Boolean, default: false })
  passwordResetCodeVerified?: boolean;

  @Prop()
  lastResetCodeSentAt!: Date;

  @Prop({ type: Date, default: null })
  lastResendCodeAt?: Date;

  @Prop({ type: [Date], default: [] })
  resetCodeRequests!: Date[];

  @Prop({ default: true })
  active!: boolean;

  @Prop({
    type: String,
    enum: ['super-admin', 'admin', 'employee', 'guest'],
    default: 'employee',
  })
  role!: string;

  @Prop()
  position!: string;

  @Prop({ unique: true })
  jobId!: number;

  @Prop({ default: Date.now })
  hireDate!: Date;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Company' })
  companyId!: Types.ObjectId;

  @Prop({ select: false })
  refreshToken!: string;

  @Prop({ select: false })
  refreshTokenExpires!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before save
UserSchema.pre<UserDocument>('save', async function (this: UserDocument) {
  if (!this.isModified('password')) return;

  this.password = await bcrypt.hash(this.password, 8);
  this.changedPasswordAt = new Date();
});

// Method to compare refresh token
UserSchema.methods.compareRefreshToken = async function (
  this: UserDocument,
  token: string,
): Promise<boolean> {
  if (!this.refreshToken) return false;
  return await bcrypt.compare(token, this.refreshToken);
};
